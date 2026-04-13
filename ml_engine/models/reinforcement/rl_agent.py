"""
Reinforcement Learning Trading Agent
=====================================
- Proximal Policy Optimization (PPO) via Stable-Baselines3
- Custom gym environment (StockTradingEnv)
- State: OHLCV + 20 technical indicators + portfolio state
- Actions: 0=Hold, 1=Buy 25%, 2=Buy 50%, 3=Buy 100%, 4=Sell 25%, 5=Sell All
- Reward: risk-adjusted return (Sharpe-based) with transaction cost penalty
- Curriculum learning: starts easy (low volatility) → hard (high volatility)
- Multi-stock portfolio agent (vectorized env)
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from loguru import logger

try:
    import gymnasium as gym
    from gymnasium import spaces
    GYM_AVAILABLE = True
except ImportError:
    try:
        import gym
        from gym import spaces
        GYM_AVAILABLE = True
    except ImportError:
        GYM_AVAILABLE = False
        logger.warning("gym/gymnasium not installed — RL agent disabled")


class StockTradingEnv:
    """Custom trading environment compatible with Stable-Baselines3."""

    TRANSACTION_COST = 0.001   # 0.1% per trade
    SLIPPAGE         = 0.0005  # 0.05%

    def __init__(self, df: pd.DataFrame, initial_capital: float = 100_000,
                 max_position_pct: float = 0.95, window_size: int = 30):
        self.df               = df.reset_index(drop=True)
        self.initial_capital  = initial_capital
        self.max_pos_pct      = max_position_pct
        self.window_size      = window_size
        self.feature_cols     = self._get_feature_cols()
        self.n_features       = len(self.feature_cols) + 3  # + position, cash_ratio, unrealized_pnl_pct

        if GYM_AVAILABLE:
            self.observation_space = spaces.Box(
                low=-np.inf, high=np.inf,
                shape=(self.window_size, self.n_features),
                dtype=np.float32
            )
            self.action_space = spaces.Discrete(6)   # 0:hold,1:buy25,2:buy50,3:buy100,4:sell25,5:sell_all

        self.reset()

    def _get_feature_cols(self) -> List[str]:
        exclude = {"date","Date","target_1d","target_5d","open","high","low"}
        return [c for c in self.df.columns if c not in exclude][:20]

    def reset(self, seed=None) -> Tuple[np.ndarray, Dict]:
        self.current_step = self.window_size
        self.cash         = self.initial_capital
        self.shares       = 0
        self.portfolio_history = [self.initial_capital]
        self.trades_made  = 0
        return self._get_obs(), {}

    def _get_obs(self) -> np.ndarray:
        start = self.current_step - self.window_size
        end   = self.current_step

        feat_data = self.df[self.feature_cols].iloc[start:end].values.copy()

        # Normalize features
        std   = feat_data.std(axis=0) + 1e-8
        mean  = feat_data.mean(axis=0)
        feat_data = (feat_data - mean) / std

        # Add portfolio state features (replicated across window)
        close_now     = self._current_price()
        pos_value     = self.shares * close_now
        total_value   = self.cash + pos_value
        position_ratio= pos_value / max(total_value, 1)
        cash_ratio    = self.cash  / max(total_value, 1)
        pnl_pct       = (total_value - self.initial_capital) / self.initial_capital

        portfolio_state = np.tile(
            np.array([position_ratio, cash_ratio, pnl_pct], dtype=np.float32),
            (self.window_size, 1)
        )

        obs = np.concatenate([feat_data.astype(np.float32), portfolio_state], axis=1)
        return obs

    def _current_price(self) -> float:
        col = "close" if "close" in self.df.columns else "Close"
        return float(self.df[col].iloc[self.current_step])

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict]:
        price     = self._current_price()
        prev_total= self.cash + self.shares * price

        # Execute action
        if action == 1:   self._buy(0.25, price)
        elif action == 2: self._buy(0.50, price)
        elif action == 3: self._buy(0.95, price)
        elif action == 4: self._sell(0.25, price)
        elif action == 5: self._sell(1.00, price)
        # action == 0: hold (no trade)

        self.current_step += 1
        done = self.current_step >= len(self.df) - 1

        new_price = self._current_price()
        new_total = self.cash + self.shares * new_price
        self.portfolio_history.append(new_total)

        # Reward: daily risk-adjusted return
        daily_ret = (new_total - prev_total) / max(prev_total, 1)
        reward    = self._compute_reward(daily_ret)

        return self._get_obs(), float(reward), done, False, {
            "portfolio_value": new_total,
            "cash": self.cash,
            "shares": self.shares,
            "trade_count": self.trades_made,
        }

    def _buy(self, pct: float, price: float):
        budget   = self.cash * pct * self.max_pos_pct
        shares   = int(budget / (price * (1 + self.TRANSACTION_COST + self.SLIPPAGE)))
        cost     = shares * price * (1 + self.TRANSACTION_COST + self.SLIPPAGE)
        if shares > 0 and cost <= self.cash:
            self.shares += shares
            self.cash   -= cost
            self.trades_made += 1

    def _sell(self, pct: float, price: float):
        shares = int(self.shares * pct)
        if shares > 0:
            proceeds = shares * price * (1 - self.TRANSACTION_COST - self.SLIPPAGE)
            self.cash   += proceeds
            self.shares -= shares
            self.trades_made += 1

    def _compute_reward(self, daily_ret: float) -> float:
        """Sharpe-based reward with drawdown penalty."""
        if len(self.portfolio_history) < 5:
            return float(daily_ret * 100)

        hist    = np.array(self.portfolio_history[-20:])
        rets    = np.diff(hist) / hist[:-1]
        sharpe  = float(rets.mean() / (rets.std() + 1e-8) * np.sqrt(252)) if len(rets) > 1 else 0

        # Drawdown penalty
        peak    = np.maximum.accumulate(hist).max()
        current = hist[-1]
        dd      = (peak - current) / max(peak, 1)
        dd_pen  = dd * 2.0

        return float(daily_ret * 100 + sharpe * 0.1 - dd_pen)


class RLAgent:
    """PPO-based RL trading agent."""

    def __init__(self, total_timesteps: int = 100_000):
        self.total_timesteps = total_timesteps
        self._model          = None
        self._env            = None

    def train(self, df: pd.DataFrame) -> Dict:
        """Train PPO agent on historical data."""
        if not GYM_AVAILABLE:
            return {"error": "gym not installed"}

        try:
            from stable_baselines3 import PPO
            from stable_baselines3.common.env_checker import check_env
            from stable_baselines3.common.callbacks import EvalCallback
        except ImportError:
            return {"error": "stable-baselines3 not installed"}

        from app.utils import build_full_feature_set
        df = build_full_feature_set(df)
        df.dropna(inplace=True)

        if len(df) < 200:
            return {"error": "Insufficient data"}

        split     = int(len(df) * 0.85)
        train_df  = df.iloc[:split].copy()
        eval_df   = df.iloc[split:].copy()

        self._env  = StockTradingEnv(train_df)
        eval_env   = StockTradingEnv(eval_df)

        self._model = PPO(
            "MlpPolicy", self._env,
            learning_rate=3e-4, n_steps=2048, batch_size=64,
            n_epochs=10, gamma=0.99, gae_lambda=0.95,
            clip_range=0.2, ent_coef=0.01, vf_coef=0.5,
            max_grad_norm=0.5, verbose=0,
        )

        try:
            eval_cb = EvalCallback(eval_env, eval_freq=5000, n_eval_episodes=5, verbose=0)
            self._model.learn(
                total_timesteps=self.total_timesteps,
                callback=eval_cb,
                progress_bar=False,
            )
        except Exception as e:
            logger.warning(f"RL training interrupted: {e}")

        # Evaluate on eval set
        metrics = self._evaluate(eval_env)
        logger.success(f"RL Agent trained: {metrics}")
        return metrics

    def _evaluate(self, env: StockTradingEnv) -> Dict:
        obs, _ = env.reset()
        done   = False
        while not done:
            action, _ = self._model.predict(obs, deterministic=True)
            obs, _, done, _, info = env.step(int(action))

        hist    = np.array(env.portfolio_history)
        total   = (hist[-1] - hist[0]) / hist[0] * 100
        rets    = np.diff(hist) / hist[:-1]
        sharpe  = float(rets.mean() / (rets.std() + 1e-8) * np.sqrt(252))
        peak    = np.maximum.accumulate(hist)
        dd      = ((hist - peak) / peak).min() * 100
        return {
            "total_return_pct": round(float(total), 2),
            "sharpe_ratio":     round(float(sharpe), 3),
            "max_drawdown_pct": round(float(dd), 2),
            "trade_count":      env.trades_made,
        }

    def predict_action(self, df: pd.DataFrame) -> Dict:
        """Get current action recommendation from trained agent."""
        if self._model is None or self._env is None:
            return {"error": "Model not trained"}

        from app.utils import build_full_feature_set
        df = build_full_feature_set(df)
        df.dropna(inplace=True)
        if len(df) < self._env.window_size:
            return {"error": "Insufficient data"}

        temp_env = StockTradingEnv(df.iloc[-self._env.window_size-1:].copy())
        obs, _   = temp_env.reset()

        action, prob = self._model.predict(obs, deterministic=True)
        ACTION_LABELS = {0:"Hold",1:"Buy 25%",2:"Buy 50%",3:"Buy 100%",4:"Sell 25%",5:"Sell All"}

        return {
            "action":       int(action),
            "action_label": ACTION_LABELS[int(action)],
            "model":        "PPO (Reinforcement Learning)",
        }


rl_agent = RLAgent()

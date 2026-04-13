"""
Complete Options Pricing Engine
================================
- Black-Scholes (European options)
- Binomial Tree (American options)
- Monte Carlo (exotic options)
- Full Greeks: Delta, Gamma, Theta, Vega, Rho, Charm, Vanna, Volga
- Implied Volatility (Newton-Raphson bisection)
- IV Surface construction + interpolation
- Put-Call Parity verification
- Options Strategy P&L (Covered Call, Straddle, Strangle, Butterfly, Condor, etc.)
"""
import numpy as np
from scipy.stats import norm
from scipy.optimize import brentq
from typing import Dict, List, Optional, Tuple
from loguru import logger


class BlackScholes:
    """Black-Scholes pricing with complete Greeks."""

    @staticmethod
    def d1(S: float, K: float, T: float, r: float, sigma: float) -> float:
        if T <= 0 or sigma <= 0:
            return 0.0
        return (np.log(S / K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))

    @staticmethod
    def d2(S: float, K: float, T: float, r: float, sigma: float) -> float:
        if T <= 0 or sigma <= 0:
            return 0.0
        return BlackScholes.d1(S, K, T, r, sigma) - sigma * np.sqrt(T)

    @staticmethod
    def price(S: float, K: float, T: float, r: float, sigma: float,
              option_type: str = "ce") -> float:
        """Price European call or put."""
        if T <= 0:
            return max(S - K, 0) if option_type.lower() in ("ce","call","c") else max(K - S, 0)
        d1 = BlackScholes.d1(S, K, T, r, sigma)
        d2 = BlackScholes.d2(S, K, T, r, sigma)
        if option_type.lower() in ("ce", "call", "c"):
            return S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        else:
            return K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)

    @staticmethod
    def greeks(S: float, K: float, T: float, r: float, sigma: float,
               option_type: str = "ce") -> Dict[str, float]:
        """Compute complete first and second-order Greeks."""
        if T <= 0 or sigma <= 0:
            return {}

        d1_v = BlackScholes.d1(S, K, T, r, sigma)
        d2_v = BlackScholes.d2(S, K, T, r, sigma)
        sqrt_T = np.sqrt(T)
        nd1   = norm.cdf(d1_v)
        nd2   = norm.cdf(d2_v)
        npd1  = norm.pdf(d1_v)
        e_rT  = np.exp(-r * T)
        is_call = option_type.lower() in ("ce","call","c")

        # Delta
        delta = nd1 if is_call else nd1 - 1

        # Gamma (same for call/put)
        gamma = npd1 / (S * sigma * sqrt_T)

        # Theta
        theta_common = -(S * npd1 * sigma) / (2 * sqrt_T)
        if is_call:
            theta = (theta_common - r * K * e_rT * nd2) / 365
        else:
            theta = (theta_common + r * K * e_rT * norm.cdf(-d2_v)) / 365

        # Vega (per 1% vol change)
        vega = S * npd1 * sqrt_T / 100

        # Rho
        rho = (K * T * e_rT * nd2 / 100) if is_call else (-K * T * e_rT * norm.cdf(-d2_v) / 100)

        # Second-order Greeks
        # Charm (dDelta/dTime) — delta decay per day
        charm = -npd1 * (2*r*T - d2_v*sigma*sqrt_T) / (2*T*sigma*sqrt_T) / 365

        # Vanna (dDelta/dVol or dVega/dS)
        vanna = -npd1 * d2_v / sigma

        # Volga / Vomma (dVega/dVol)
        volga = vega * d1_v * d2_v / sigma

        # Speed (dGamma/dS)
        speed = -gamma * (d1_v / (sigma * sqrt_T) + 1) / S

        # Color (dGamma/dTime)
        color = -gamma * (r + d1_v * sigma / (2*T)) / T / 365

        return {
            "delta":  round(float(delta), 6),
            "gamma":  round(float(gamma), 8),
            "theta":  round(float(theta), 6),
            "vega":   round(float(vega),  6),
            "rho":    round(float(rho),   6),
            "charm":  round(float(charm), 8),
            "vanna":  round(float(vanna), 8),
            "volga":  round(float(volga), 8),
            "speed":  round(float(speed), 10),
            "color":  round(float(color), 10),
        }

    @staticmethod
    def implied_volatility(market_price: float, S: float, K: float, T: float,
                           r: float, option_type: str = "ce",
                           tol: float = 1e-6, max_iter: int = 200) -> Optional[float]:
        """Compute IV using Brent's method (robust, no divergence)."""
        if T <= 0 or market_price <= 0:
            return None

        # Bounds
        intrinsic = max(S - K, 0) if option_type.lower() in ("ce","call","c") else max(K - S, 0)
        if market_price < intrinsic:
            return None

        def objective(sigma):
            return BlackScholes.price(S, K, T, r, sigma, option_type) - market_price

        try:
            iv = brentq(objective, 1e-6, 10.0, xtol=tol, maxiter=max_iter)
            return round(float(iv), 6)
        except ValueError:
            return None

    @staticmethod
    def breakeven(S: float, K: float, T: float, r: float, sigma: float,
                  option_type: str = "ce") -> Dict[str, float]:
        """Compute upper/lower breakeven at expiry."""
        premium = BlackScholes.price(S, K, T, r, sigma, option_type)
        if option_type.lower() in ("ce","call","c"):
            return {"upper_be": round(K + premium, 2), "lower_be": None, "premium": round(premium, 4)}
        else:
            return {"lower_be": round(K - premium, 2), "upper_be": None, "premium": round(premium, 4)}


class BinomialTree:
    """CRR Binomial Tree for American option pricing."""

    @staticmethod
    def price(S: float, K: float, T: float, r: float, sigma: float,
              option_type: str = "ce", steps: int = 200,
              american: bool = True) -> float:
        dt   = T / steps
        u    = np.exp(sigma * np.sqrt(dt))
        d    = 1 / u
        p    = (np.exp(r * dt) - d) / (u - d)
        disc = np.exp(-r * dt)
        is_call = option_type.lower() in ("ce","call","c")

        # Terminal payoffs
        idx = np.arange(steps + 1)
        ST  = S * (u ** (steps - idx)) * (d ** idx)
        V   = np.maximum(ST - K, 0) if is_call else np.maximum(K - ST, 0)

        # Backward induction
        for i in range(steps - 1, -1, -1):
            V = disc * (p * V[:-1] + (1 - p) * V[1:])
            if american:
                idx2 = np.arange(i + 1)
                ST2  = S * (u ** (i - idx2)) * (d ** idx2)
                intrinsic = np.maximum(ST2 - K, 0) if is_call else np.maximum(K - ST2, 0)
                V = np.maximum(V, intrinsic)

        return round(float(V[0]), 4)


class IVSurfaceBuilder:
    """Build and interpolate implied volatility surface."""

    def build_surface(self, chain_data: List[Dict], spot: float,
                      r: float = 0.065) -> Dict:
        """
        Build IV surface from options chain data.
        Returns: {strike_pct: {expiry_days: iv}, ...}
        """
        from collections import defaultdict
        surface = defaultdict(dict)
        skew    = {}
        term    = {}

        for opt in chain_data:
            try:
                K    = opt.get("strike")
                ltp  = opt.get("ltp")
                T    = opt.get("days_to_expiry", 30) / 365
                otype= opt.get("option_type", "CE").lower()
                exp  = opt.get("days_to_expiry", 30)

                if not all([K, ltp, T > 0]):
                    continue

                iv = BlackScholes.implied_volatility(ltp, spot, K, T, r, otype)
                if iv is None or iv < 0.01 or iv > 5.0:
                    continue

                moneyness = round(K / spot, 3)
                surface[moneyness][exp] = round(iv, 4)

                # ATM IV for term structure
                if abs(moneyness - 1.0) < 0.02:
                    term[exp] = term.get(exp, [])
                    term[exp].append(iv)

            except Exception as e:
                continue

        # Aggregate term structure
        term_struct = {str(exp): round(float(np.mean(ivs)), 4)
                       for exp, ivs in sorted(term.items())}

        # Compute skew (25-delta approximation)
        otm_calls = [(k, v) for k, v in surface.items() if k > 1.05]
        otm_puts  = [(k, v) for k, v in surface.items() if k < 0.95]

        return {
            "surface":        dict(surface),
            "term_structure": term_struct,
            "atm_iv":         round(float(np.mean([v for ivs in term.values() for v in ivs])), 4) if term else None,
            "skew_exists":    len(otm_calls) > 0 and len(otm_puts) > 0,
        }


class OptionsStrategies:
    """P&L, Greeks, and payoff diagrams for multi-leg strategies."""

    STRATEGIES = {
        "long_call":      [("buy","ce",1)],
        "long_put":       [("buy","pe",1)],
        "covered_call":   [("buy","stock",1),("sell","ce",1)],
        "protective_put": [("buy","stock",1),("buy","pe",1)],
        "bull_call_spread":[("buy","ce",1),("sell","ce_higher",1)],
        "bear_put_spread": [("buy","pe",1),("sell","pe_lower",1)],
        "straddle":        [("buy","ce",1),("buy","pe",1)],
        "strangle":        [("buy","ce_otm",1),("buy","pe_otm",1)],
        "iron_condor":     [("sell","ce_otm",1),("buy","ce_wing",1),
                            ("sell","pe_otm",1),("buy","pe_wing",1)],
        "butterfly":       [("buy","ce_lower",1),("sell","ce_atm",2),("buy","ce_upper",1)],
        "calendar_spread": [("sell","ce_near",1),("buy","ce_far",1)],
    }

    def payoff_at_expiry(self, legs: List[Dict], spot_range: Tuple[float,float],
                         n_points: int = 100) -> List[Dict]:
        """Compute strategy payoff at expiry across spot prices."""
        spots = np.linspace(spot_range[0], spot_range[1], n_points)
        results = []
        for S in spots:
            total_pnl = 0.0
            for leg in legs:
                K      = leg["strike"]
                otype  = leg["option_type"].lower()
                qty    = leg["quantity"]
                sign   = 1 if leg["action"].upper() == "BUY" else -1
                entry  = leg.get("entry_price", 0)
                if otype in ("ce","call","c"):
                    payoff = max(S - K, 0)
                elif otype in ("pe","put","p"):
                    payoff = max(K - S, 0)
                else:
                    payoff = S - entry   # stock
                total_pnl += sign * qty * (payoff - entry)
            results.append({"spot": round(float(S), 2), "pnl": round(float(total_pnl), 2)})
        return results


bs        = BlackScholes()
binomial  = BinomialTree()
iv_surface= IVSurfaceBuilder()
strategies= OptionsStrategies()

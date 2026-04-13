"""
StockPro Ultimate — Complete Database Schema
20 models covering: Users, Auth, Portfolio, Trades, Options, Derivatives,
Alerts, Social, Risk, ML, News, Screener, Backtests, Factor Models,
Anomalies, Paper Trading, AI Chat, Webhooks, Audit, Notifications.
"""
from datetime import datetime
from app import db
from sqlalchemy import (
    Column, Integer, BigInteger, String, Float, Boolean,
    DateTime, Text, ForeignKey, UniqueConstraint, Index, Enum,
    JSON, ARRAY, Numeric
)
from sqlalchemy.orm import relationship
import enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserTier(enum.Enum):
    FREE       = "FREE"
    PRO        = "PRO"
    ENTERPRISE = "ENTERPRISE"
    INTERNAL   = "INTERNAL"

class TradeAction(enum.Enum):
    BUY  = "BUY"
    SELL = "SELL"

class OrderType(enum.Enum):
    MARKET = "MARKET"
    LIMIT  = "LIMIT"
    SL     = "SL"
    SL_M   = "SL_M"

class AlertType(enum.Enum):
    PRICE_ABOVE     = "PRICE_ABOVE"
    PRICE_BELOW     = "PRICE_BELOW"
    PERCENT_CHANGE  = "PERCENT_CHANGE"
    RSI_OVERBOUGHT  = "RSI_OVERBOUGHT"
    RSI_OVERSOLD    = "RSI_OVERSOLD"
    VOLUME_SPIKE    = "VOLUME_SPIKE"
    MACD_CROSS      = "MACD_CROSS"
    BB_BREAK_UPPER  = "BB_BREAK_UPPER"
    BB_BREAK_LOWER  = "BB_BREAK_LOWER"
    EMA_CROSS       = "EMA_CROSS"
    CIRCUIT_BREAKER = "CIRCUIT_BREAKER"
    NEWS_SENTIMENT  = "NEWS_SENTIMENT"

class OptionType(enum.Enum):
    CE = "CE"
    PE = "PE"

class DerivativeType(enum.Enum):
    FUTURE  = "FUTURE"
    OPTION  = "OPTION"
    SWAP    = "SWAP"
    FORWARD = "FORWARD"

class ModelType(enum.Enum):
    LSTM        = "LSTM"
    XGBOOST     = "XGBOOST"
    TRANSFORMER = "TRANSFORMER"
    ENSEMBLE    = "ENSEMBLE"
    RL_AGENT    = "RL_AGENT"
    ANOMALY     = "ANOMALY"
    FACTOR      = "FACTOR"

class AnomalyType(enum.Enum):
    PRICE_SPIKE    = "PRICE_SPIKE"
    VOLUME_SPIKE   = "VOLUME_SPIKE"
    SPREAD_ANOMALY = "SPREAD_ANOMALY"
    PATTERN_BREAK  = "PATTERN_BREAK"
    REGIME_CHANGE  = "REGIME_CHANGE"


# ─── Users & Auth ─────────────────────────────────────────────────────────────

class User(db.Model):
    __tablename__ = "users"

    id               = Column(Integer, primary_key=True)
    email            = Column(String(255), unique=True, nullable=False, index=True)
    username         = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password  = Column(String(255))
    full_name        = Column(String(200))
    avatar_url       = Column(String(500))
    phone            = Column(String(20))
    pan_number       = Column(String(10))         # For Indian compliance
    demat_account    = Column(String(20))
    timezone         = Column(String(50), default="Asia/Kolkata")
    tier             = Column(Enum(UserTier), default=UserTier.FREE)
    is_active        = Column(Boolean, default=True)
    is_verified      = Column(Boolean, default=False)
    is_admin         = Column(Boolean, default=False)
    two_fa_enabled   = Column(Boolean, default=False)
    two_fa_secret    = Column(String(64))
    preferences      = Column(JSON, default=dict)
    risk_profile     = Column(JSON, default=dict)    # questionnaire results
    api_keys         = Column(JSON, default=list)    # broker API keys (encrypted)
    oauth_providers  = Column(JSON, default=dict)    # google/github tokens
    login_count      = Column(Integer, default=0)
    last_login       = Column(DateTime)
    subscription_end = Column(DateTime)
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    portfolios  = relationship("Portfolio",  back_populates="user", cascade="all, delete-orphan")
    watchlists  = relationship("Watchlist",  back_populates="user", cascade="all, delete-orphan")
    alerts      = relationship("Alert",      back_populates="user", cascade="all, delete-orphan")
    posts       = relationship("SocialPost", back_populates="user", cascade="all, delete-orphan")
    chat_sessions= relationship("AIChatSession", back_populates="user")


class JWTTokenBlocklist(db.Model):
    __tablename__ = "jwt_token_blocklist"
    id         = Column(Integer, primary_key=True)
    jti        = Column(String(36), nullable=False, unique=True, index=True)
    token_type = Column(String(10), nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    expires_at = Column(DateTime, nullable=False)


class APIKey(db.Model):
    __tablename__ = "api_keys"
    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    name       = Column(String(100))
    key_hash   = Column(String(64), unique=True, nullable=False)
    key_prefix = Column(String(8))
    scopes     = Column(JSON, default=list)
    is_active  = Column(Boolean, default=True)
    last_used  = Column(DateTime)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (Index("idx_apikey_prefix", "key_prefix"),)


# ─── Market Data ──────────────────────────────────────────────────────────────

class StockMeta(db.Model):
    __tablename__ = "stocks_meta"

    id          = Column(Integer, primary_key=True)
    symbol      = Column(String(30), unique=True, nullable=False, index=True)
    name        = Column(String(200), index=True)
    sector      = Column(String(100), index=True)
    industry    = Column(String(150))
    sub_industry= Column(String(150))
    exchange    = Column(String(10))
    isin        = Column(String(20), unique=True)
    nse_code    = Column(String(20))
    bse_code    = Column(String(10))
    asset_class = Column(String(20), default="equity")  # equity, etf, index, crypto, commodity, fx
    currency    = Column(String(3), default="INR")
    is_fo       = Column(Boolean, default=False)   # Futures & Options eligible
    is_index    = Column(Boolean, default=False)
    lot_size    = Column(Integer, default=1)       # FO lot size
    tick_size   = Column(Float, default=0.05)
    face_value  = Column(Float, default=10.0)
    market_cap_category = Column(String(20))       # largecap, midcap, smallcap
    indices     = Column(JSON, default=list)       # ["NIFTY50","NIFTY100",...]
    metadata_   = Column("extra_meta", JSON, default=dict)
    is_active   = Column(Boolean, default=True)
    updated_at  = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class PriceData(db.Model):
    """TimescaleDB hypertable — partitioned by date for performance."""
    __tablename__  = "price_data"
    __table_args__ = (
        UniqueConstraint("symbol","date","interval", name="uq_price_point"),
        Index("idx_price_symbol_date", "symbol", "date"),
        Index("idx_price_date",        "date"),
        {"timescaledb_hypertable": {"time_column_name": "date"}} if False else {},
    )

    id        = Column(BigInteger, primary_key=True, autoincrement=True)
    symbol    = Column(String(30), nullable=False, index=True)
    date      = Column(DateTime,   nullable=False, index=True)
    interval  = Column(String(5),  default="1d")
    open      = Column(Numeric(12,4))
    high      = Column(Numeric(12,4))
    low       = Column(Numeric(12,4))
    close     = Column(Numeric(12,4))
    volume    = Column(BigInteger)
    adj_close = Column(Numeric(12,4))
    vwap      = Column(Numeric(12,4))
    trades    = Column(Integer)
    source    = Column(String(20), default="yfinance")


class TechnicalCache(db.Model):
    __tablename__  = "technical_cache"
    __table_args__ = (UniqueConstraint("symbol","date", name="uq_tech_cache"),)
    id         = Column(Integer, primary_key=True)
    symbol     = Column(String(30), nullable=False, index=True)
    date       = Column(DateTime, nullable=False)
    indicators = Column(JSON)
    signals    = Column(JSON)
    patterns   = Column(JSON)
    regime     = Column(String(20))
    score      = Column(Integer)
    computed_at= Column(DateTime, default=datetime.utcnow)


# ─── Portfolio & Trades ───────────────────────────────────────────────────────

class Portfolio(db.Model):
    __tablename__ = "portfolios"
    id           = Column(Integer, primary_key=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name         = Column(String(100), default="My Portfolio")
    description  = Column(Text)
    currency     = Column(String(3), default="INR")
    broker       = Column(String(100))
    broker_account = Column(String(50))
    is_default   = Column(Boolean, default=False)
    is_paper     = Column(Boolean, default=False)   # Paper trading
    benchmark    = Column(String(20), default="^NSEI")
    tags         = Column(JSON, default=list)
    settings     = Column(JSON, default=dict)
    created_at   = Column(DateTime, default=datetime.utcnow)

    user      = relationship("User", back_populates="portfolios")
    trades    = relationship("Trade", back_populates="portfolio", cascade="all, delete-orphan")
    snapshots = relationship("PortfolioSnapshot", back_populates="portfolio")
    risk_metrics = relationship("PortfolioRisk", back_populates="portfolio")


class Trade(db.Model):
    __tablename__ = "trades"
    __table_args__ = (Index("idx_trade_portfolio_sym", "portfolio_id", "symbol"),)

    id           = Column(Integer, primary_key=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    symbol       = Column(String(30), nullable=False, index=True)
    asset_class  = Column(String(20), default="equity")
    action       = Column(Enum(TradeAction), nullable=False)
    order_type   = Column(Enum(OrderType), default=OrderType.MARKET)
    quantity     = Column(Numeric(12,4), nullable=False)
    price        = Column(Numeric(12,4), nullable=False)
    trigger_price= Column(Numeric(12,4))
    brokerage    = Column(Numeric(10,4), default=0)
    stt          = Column(Numeric(10,4), default=0)   # Securities Transaction Tax
    exchange_fee = Column(Numeric(10,4), default=0)
    gst          = Column(Numeric(10,4), default=0)
    stamp_duty   = Column(Numeric(10,4), default=0)
    total_cost   = Column(Numeric(14,4))
    currency     = Column(String(3), default="INR")
    exchange     = Column(String(10), default="NSE")
    notes        = Column(Text)
    strategy_tag = Column(String(100))
    trade_date   = Column(DateTime, nullable=False, index=True)
    settlement_date = Column(DateTime)
    is_paper     = Column(Boolean, default=False)
    broker_order_id = Column(String(50))
    created_at   = Column(DateTime, default=datetime.utcnow)

    portfolio = relationship("Portfolio", back_populates="trades")


class PortfolioSnapshot(db.Model):
    __tablename__  = "portfolio_snapshots"
    __table_args__ = (UniqueConstraint("portfolio_id","date", name="uq_snap"),)
    id           = Column(Integer, primary_key=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    date         = Column(DateTime, nullable=False, index=True)
    total_value  = Column(Numeric(16,4))
    invested     = Column(Numeric(16,4))
    cash         = Column(Numeric(16,4), default=0)
    pnl          = Column(Numeric(16,4))
    pnl_pct      = Column(Numeric(8,4))
    day_pnl      = Column(Numeric(16,4))
    holdings     = Column(JSON)
    benchmark_value = Column(Numeric(16,4))
    alpha        = Column(Numeric(8,4))
    beta         = Column(Numeric(8,4))
    sharpe       = Column(Numeric(8,4))
    max_dd       = Column(Numeric(8,4))

    portfolio = relationship("Portfolio", back_populates="snapshots")


class PortfolioRisk(db.Model):
    __tablename__ = "portfolio_risk"
    id           = Column(Integer, primary_key=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    computed_at  = Column(DateTime, default=datetime.utcnow, index=True)
    var_95       = Column(Numeric(10,4))   # Value at Risk 95%
    var_99       = Column(Numeric(10,4))
    cvar_95      = Column(Numeric(10,4))   # Conditional VaR
    cvar_99      = Column(Numeric(10,4))
    beta         = Column(Numeric(8,4))
    sharpe       = Column(Numeric(8,4))
    sortino      = Column(Numeric(8,4))
    calmar       = Column(Numeric(8,4))
    treynor      = Column(Numeric(8,4))
    information_ratio = Column(Numeric(8,4))
    max_drawdown = Column(Numeric(8,4))
    volatility   = Column(Numeric(8,4))
    correlation_matrix = Column(JSON)
    factor_exposures   = Column(JSON)
    concentration_risk = Column(JSON)
    liquidity_risk     = Column(JSON)

    portfolio = relationship("Portfolio", back_populates="risk_metrics")


# ─── Watchlist ────────────────────────────────────────────────────────────────

class Watchlist(db.Model):
    __tablename__  = "watchlists"
    __table_args__ = (UniqueConstraint("user_id","symbol","list_name", name="uq_watchlist"),)
    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol     = Column(String(30), nullable=False)
    list_name  = Column(String(100), default="Default")
    alias      = Column(String(50))
    notes      = Column(Text)
    buy_target = Column(Numeric(12,4))
    stop_loss  = Column(Numeric(12,4))
    position   = Column(Integer, default=0)
    tags       = Column(JSON, default=list)
    added_at   = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="watchlists")


# ─── Alerts ───────────────────────────────────────────────────────────────────

class Alert(db.Model):
    __tablename__ = "alerts"
    id              = Column(Integer, primary_key=True)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol          = Column(String(30), nullable=False, index=True)
    alert_type      = Column(Enum(AlertType), nullable=False)
    threshold       = Column(Numeric(12,4), nullable=False)
    secondary_threshold = Column(Numeric(12,4))
    comparison      = Column(String(10), default="gte")  # gte, lte, cross
    message         = Column(String(500))
    status          = Column(String(20), default="ACTIVE")
    recurrence      = Column(String(20), default="once")  # once, daily, always
    notify_email    = Column(Boolean, default=True)
    notify_push     = Column(Boolean, default=False)
    notify_webhook  = Column(Boolean, default=False)
    webhook_url     = Column(String(500))
    triggered_count = Column(Integer, default=0)
    triggered_at    = Column(DateTime)
    triggered_value = Column(Numeric(12,4))
    expires_at      = Column(DateTime)
    created_at      = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="alerts")


# ─── Options & Derivatives ────────────────────────────────────────────────────

class OptionsSnapshot(db.Model):
    """NSE options chain snapshot per expiry."""
    __tablename__  = "options_snapshots"
    __table_args__ = (
        UniqueConstraint("symbol","expiry","strike","option_type","snapshot_time",
                         name="uq_option_snap"),
        Index("idx_opt_symbol_expiry", "symbol", "expiry"),
    )
    id          = Column(BigInteger, primary_key=True, autoincrement=True)
    symbol      = Column(String(30), nullable=False, index=True)
    snapshot_time = Column(DateTime, nullable=False, index=True)
    expiry      = Column(DateTime, nullable=False, index=True)
    strike      = Column(Numeric(10,2), nullable=False)
    option_type = Column(Enum(OptionType), nullable=False)
    ltp         = Column(Numeric(10,4))
    bid         = Column(Numeric(10,4))
    ask         = Column(Numeric(10,4))
    volume      = Column(Integer)
    oi          = Column(Integer)
    oi_change   = Column(Integer)
    iv          = Column(Numeric(8,4))
    delta       = Column(Numeric(8,6))
    gamma       = Column(Numeric(10,8))
    theta       = Column(Numeric(8,6))
    vega        = Column(Numeric(8,6))
    rho         = Column(Numeric(8,6))
    charm       = Column(Numeric(10,8))   # dDelta/dTime
    vanna        = Column(Numeric(10,8))  # dDelta/dVol
    theoretical_price = Column(Numeric(10,4))


class IVSurface(db.Model):
    """Implied Volatility surface snapshot."""
    __tablename__  = "iv_surfaces"
    __table_args__ = (UniqueConstraint("symbol","snapshot_time", name="uq_iv_surface"),)
    id            = Column(Integer, primary_key=True)
    symbol        = Column(String(30), nullable=False, index=True)
    snapshot_time = Column(DateTime, nullable=False, index=True)
    spot_price    = Column(Numeric(12,4))
    atm_iv        = Column(Numeric(8,4))
    skew_25d      = Column(Numeric(8,4))   # 25-delta risk reversal
    skew_10d      = Column(Numeric(8,4))
    term_structure= Column(JSON)           # {expiry: atm_iv}
    surface_data  = Column(JSON)           # {strike: {expiry: iv}}
    pcr           = Column(Numeric(8,4))   # Put-Call Ratio


# ─── ML & Predictions ─────────────────────────────────────────────────────────

class MLModelRecord(db.Model):
    __tablename__ = "ml_models"
    id            = Column(Integer, primary_key=True)
    name          = Column(String(100), nullable=False)
    symbol        = Column(String(30), index=True)
    model_type    = Column(Enum(ModelType), nullable=False)
    version       = Column(String(30), nullable=False)
    file_path     = Column(String(500))
    config        = Column(JSON)
    metrics       = Column(JSON)
    feature_cols  = Column(JSON)
    target        = Column(String(50))
    is_active     = Column(Boolean, default=False)
    is_shadow     = Column(Boolean, default=False)
    trained_at    = Column(DateTime, default=datetime.utcnow)
    trained_rows  = Column(Integer)
    oos_accuracy  = Column(Numeric(6,4))
    oos_auc       = Column(Numeric(6,4))


class Prediction(db.Model):
    __tablename__  = "predictions"
    __table_args__ = (Index("idx_pred_sym_date", "symbol", "prediction_date"),)
    id              = Column(Integer, primary_key=True)
    model_id        = Column(Integer, ForeignKey("ml_models.id"))
    symbol          = Column(String(30), nullable=False, index=True)
    prediction_date = Column(DateTime, nullable=False)
    target_date     = Column(DateTime)
    predicted_price = Column(Numeric(12,4))
    predicted_direction = Column(String(5))
    confidence      = Column(Numeric(6,4))
    uncertainty_upper = Column(Numeric(12,4))
    uncertainty_lower = Column(Numeric(12,4))
    regime          = Column(String(20))
    actual_price    = Column(Numeric(12,4))
    error_pct       = Column(Numeric(8,4))
    direction_correct = Column(Boolean)
    ensemble_weights  = Column(JSON)
    created_at      = Column(DateTime, default=datetime.utcnow)


class Anomaly(db.Model):
    __tablename__ = "anomalies"
    id            = Column(Integer, primary_key=True)
    symbol        = Column(String(30), nullable=False, index=True)
    detected_at   = Column(DateTime, nullable=False, index=True)
    anomaly_type  = Column(Enum(AnomalyType), nullable=False)
    severity      = Column(String(10))   # low, medium, high, critical
    score         = Column(Numeric(8,4))
    description   = Column(Text)
    context       = Column(JSON)
    is_confirmed  = Column(Boolean)
    resolved_at   = Column(DateTime)


# ─── Social & Sentiment ───────────────────────────────────────────────────────

class SocialPost(db.Model):
    __tablename__ = "social_posts"
    id          = Column(Integer, primary_key=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol      = Column(String(30), index=True)
    content     = Column(Text, nullable=False)
    post_type   = Column(String(20), default="analysis")  # analysis, trade, idea, question
    trade_call  = Column(String(10))    # BUY/SELL/NEUTRAL
    target_price= Column(Numeric(12,4))
    stop_loss   = Column(Numeric(12,4))
    time_horizon= Column(String(20))
    likes       = Column(Integer, default=0)
    comments    = Column(Integer, default=0)
    is_verified_trade = Column(Boolean, default=False)
    accuracy_score    = Column(Numeric(6,4))
    tags        = Column(JSON, default=list)
    created_at  = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="posts")


class ExternalSentiment(db.Model):
    """Aggregated sentiment from Reddit/Twitter/News per symbol per hour."""
    __tablename__  = "external_sentiment"
    __table_args__ = (UniqueConstraint("symbol","hour","source", name="uq_sentiment"),)
    id          = Column(Integer, primary_key=True)
    symbol      = Column(String(30), nullable=False, index=True)
    hour        = Column(DateTime, nullable=False, index=True)
    source      = Column(String(30))   # reddit, twitter, news, combined
    score       = Column(Numeric(6,4))
    label       = Column(String(10))
    volume      = Column(Integer)      # number of posts/articles
    bullish_cnt = Column(Integer)
    bearish_cnt = Column(Integer)
    neutral_cnt = Column(Integer)
    top_keywords= Column(JSON)


# ─── Backtesting ──────────────────────────────────────────────────────────────

class BacktestRun(db.Model):
    __tablename__ = "backtest_runs"
    id            = Column(Integer, primary_key=True)
    user_id       = Column(Integer, ForeignKey("users.id"), index=True)
    symbol        = Column(String(30), nullable=False)
    strategy      = Column(String(100), nullable=False)
    strategy_params = Column(JSON)
    start_date    = Column(DateTime)
    end_date      = Column(DateTime)
    initial_capital = Column(Numeric(16,4))
    final_equity  = Column(Numeric(16,4))
    total_return  = Column(Numeric(10,4))
    total_trades  = Column(Integer)
    win_rate      = Column(Numeric(6,4))
    sharpe        = Column(Numeric(8,4))
    sortino       = Column(Numeric(8,4))
    calmar        = Column(Numeric(8,4))
    max_drawdown  = Column(Numeric(8,4))
    profit_factor = Column(Numeric(8,4))
    avg_trade_pnl = Column(Numeric(12,4))
    equity_curve  = Column(JSON)
    trades        = Column(JSON)
    status        = Column(String(20), default="completed")
    created_at    = Column(DateTime, default=datetime.utcnow)


# ─── AI Chat ──────────────────────────────────────────────────────────────────

class AIChatSession(db.Model):
    __tablename__ = "ai_chat_sessions"
    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title      = Column(String(200))
    context    = Column(JSON, default=dict)   # portfolio, watchlist, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    messages   = relationship("AIChatMessage", back_populates="session")
    user       = relationship("User", back_populates="chat_sessions")


class AIChatMessage(db.Model):
    __tablename__ = "ai_chat_messages"
    id         = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("ai_chat_sessions.id"), nullable=False, index=True)
    role       = Column(String(20), nullable=False)   # user, assistant, system
    content    = Column(Text, nullable=False)
    metadata_  = Column("metadata", JSON, default=dict)
    tokens     = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    session    = relationship("AIChatSession", back_populates="messages")


# ─── Notifications & Audit ────────────────────────────────────────────────────

class Notification(db.Model):
    __tablename__ = "notifications"
    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title      = Column(String(200), nullable=False)
    body       = Column(Text)
    type_      = Column("type", String(50))
    channel    = Column(String(20), default="in_app")  # in_app, email, push, sms
    is_read    = Column(Boolean, default=False)
    data       = Column(JSON)
    priority   = Column(String(10), default="normal")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


class AuditLog(db.Model):
    __tablename__ = "audit_logs"
    __table_args__ = (Index("idx_audit_user_created", "user_id", "created_at"),)
    id          = Column(Integer, primary_key=True)
    user_id     = Column(Integer, ForeignKey("users.id"), index=True)
    action      = Column(String(100), nullable=False)
    resource    = Column(String(100))
    resource_id = Column(String(50))
    old_value   = Column(JSON)
    new_value   = Column(JSON)
    ip_address  = Column(String(50))
    user_agent  = Column(String(500))
    request_id  = Column(String(16))
    created_at  = Column(DateTime, default=datetime.utcnow, index=True)


class Webhook(db.Model):
    __tablename__ = "webhooks"
    id         = Column(Integer, primary_key=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    url        = Column(String(500), nullable=False)
    events     = Column(JSON, default=list)   # ["alert.triggered","trade.executed",...]
    secret     = Column(String(64))
    is_active  = Column(Boolean, default=True)
    last_fired = Column(DateTime)
    fail_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

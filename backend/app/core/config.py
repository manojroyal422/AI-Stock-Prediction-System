"""
StockPro Ultimate — Enterprise Configuration
Supports: development, testing, staging, production, dr (disaster recovery)
"""
import os
from datetime import timedelta


class BaseConfig:
    # ── Core ──────────────────────────────────────────────────────────────
    VERSION = "3.0.0"
    APP_NAME = "StockPro Ultimate"
    ENVIRONMENT = os.environ.get("ENVIRONMENT", "production")
    SECRET_KEY = os.environ.get("SECRET_KEY", "CHANGE_ME")
    ALLOWED_ORIGINS = os.environ.get(
        "ALLOWED_ORIGINS", "http://localhost:3000"
    ).split(",")
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB

    # ── Primary Database (PostgreSQL + TimescaleDB) ──────────────────────
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL",
        "postgresql://stockuser:stockpass@localhost:5432/stockpro_ultimate",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 20,
        "max_overflow": 40,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
        "pool_timeout": 30,
        "connect_args": {
            "options": "-c timezone=UTC -c statement_timeout=30000"
        },
    }
    SQLALCHEMY_RECORD_QUERIES = False

    # ── Read Replica ──────────────────────────────────────────────────────
    READ_REPLICA_URL = os.environ.get("READ_REPLICA_URL", "")

    # ── Redis (primary) ───────────────────────────────────────────────────
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    REDIS_CACHE_URL = os.environ.get("REDIS_CACHE_URL", "redis://localhost:6379/1")
    REDIS_SESSIONS_URL = os.environ.get("REDIS_SESSIONS_URL", "redis://localhost:6379/2")
    REDIS_PUBSUB_URL = os.environ.get("REDIS_PUBSUB_URL", "redis://localhost:6379/3")

    # ── Redis Sentinel (HA) ───────────────────────────────────────────────
    REDIS_SENTINEL_HOSTS = os.environ.get("REDIS_SENTINEL_HOSTS", "")
    REDIS_SENTINEL_MASTER = os.environ.get("REDIS_SENTINEL_MASTER", "mymaster")
    USE_REDIS_SENTINEL = bool(REDIS_SENTINEL_HOSTS)

    # ── Celery ────────────────────────────────────────────────────────────
    CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/4")
    CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/5")
    CELERY_BEAT_SCHEDULE = {
        "tick-quotes-5m": {"task": "app.tasks.data_tasks.refresh_quotes_batch", "schedule": 300, "kwargs": {"tier": "nifty50"}},
        "tick-quotes-realtime": {"task": "app.tasks.data_tasks.stream_live_quotes", "schedule": 5},
        "refresh-analysis-15m": {"task": "app.tasks.data_tasks.refresh_technical_batch", "schedule": 900},
        "refresh-fundamentals": {"task": "app.tasks.data_tasks.refresh_fundamentals_batch", "schedule": 86400},
        "fetch-news-30m": {"task": "app.tasks.data_tasks.fetch_news_batch", "schedule": 1800},
        "compute-sentiment": {"task": "app.tasks.ml_tasks.compute_sentiment_batch", "schedule": 1800},
        "check-alerts-60s": {"task": "app.tasks.alert_tasks.check_all_alerts", "schedule": 60},
        "portfolio-pnl-5m": {"task": "app.tasks.portfolio_tasks.update_all_pnl", "schedule": 300},
        "portfolio-risk-1h": {"task": "app.tasks.portfolio_tasks.compute_risk_metrics", "schedule": 3600},
        "retrain-models-weekly": {"task": "app.tasks.ml_tasks.retrain_all_weekly", "schedule": timedelta(days=7)},
        "evaluate-models-daily": {"task": "app.tasks.ml_tasks.evaluate_all_models", "schedule": timedelta(days=1)},
        "options-data-15m": {"task": "app.tasks.data_tasks.fetch_options_batch", "schedule": 900},
        "compute-greeks-1h": {"task": "app.tasks.derivatives_tasks.compute_greeks", "schedule": 3600},
        "social-scan-1h": {"task": "app.tasks.social_tasks.scan_social_sentiment", "schedule": 3600},
        "anomaly-detect-30m": {"task": "app.tasks.ml_tasks.run_anomaly_detection", "schedule": 1800},
        "factor-rebalance-1d": {"task": "app.tasks.ml_tasks.compute_factor_exposures", "schedule": timedelta(days=1)},
        "generate-reports-eod": {"task": "app.tasks.report_tasks.generate_eod_report", "schedule": timedelta(days=1)},
        "cleanup-old-data": {"task": "app.tasks.maintenance_tasks.cleanup_old_data", "schedule": timedelta(days=7)},
    }

    # ── Cache ─────────────────────────────────────────────────────────────
    CACHE_TYPE = "RedisCache"
    CACHE_REDIS_URL = os.environ.get("REDIS_CACHE_URL", "redis://localhost:6379/1")
    CACHE_DEFAULT_TIMEOUT = 300
    CACHE_KEY_PREFIX = "sp3:"

    # ── JWT ───────────────────────────────────────────────────────────────
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "JWT_CHANGE_ME")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_BLACKLIST_ENABLED = True
    JWT_BLACKLIST_TOKEN_CHECKS = ["access", "refresh"]

    # ── OAuth2 ────────────────────────────────────────────────────────────
    GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")

    # ── Rate Limiting ─────────────────────────────────────────────────────
    RATELIMIT_STORAGE_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    RATELIMIT_DEFAULT = "300/hour"
    RATELIMIT_TIERS = {
        "free": "100/hour;10/minute",
        "pro": "1000/hour;50/minute",
        "enterprise": "10000/hour;500/minute",
        "internal": "unlimited",
    }

    # ── External APIs ─────────────────────────────────────────────────────
    NEWS_API_KEY = os.environ.get("NEWS_API_KEY", "")
    ALPHA_VANTAGE_KEY = os.environ.get("ALPHA_VANTAGE_KEY", "")
    POLYGON_API_KEY = os.environ.get("POLYGON_API_KEY", "")
    TWELVEDATA_KEY = os.environ.get("TWELVEDATA_KEY", "")
    FINNHUB_KEY = os.environ.get("FINNHUB_KEY", "")
    NSE_UNOFFICIAL_URL = "https://www.nseindia.com"
    BSE_API_URL = "https://api.bseindia.com"
    RBI_DATA_URL = "https://rbi.org.in"

    # ── Social Data ───────────────────────────────────────────────────────
    REDDIT_CLIENT_ID = os.environ.get("REDDIT_CLIENT_ID", "")
    REDDIT_CLIENT_SECRET = os.environ.get("REDDIT_CLIENT_SECRET", "")
    TWITTER_BEARER_TOKEN = os.environ.get("TWITTER_BEARER_TOKEN", "")

    # ── Email ─────────────────────────────────────────────────────────────
    SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
    SMTP_USER = os.environ.get("SMTP_USER", "")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
    MAIL_FROM = os.environ.get("MAIL_FROM", "noreply@stockpro.in")

    # ── Push Notifications ────────────────────────────────────────────────
    FCM_SERVER_KEY = os.environ.get("FCM_SERVER_KEY", "")
    APNS_KEY_ID = os.environ.get("APNS_KEY_ID", "")
    APNS_TEAM_ID = os.environ.get("APNS_TEAM_ID", "")

    # ── ML ────────────────────────────────────────────────────────────────
    MODEL_REGISTRY_DIR = os.environ.get("MODEL_REGISTRY_DIR", "./ml_engine/registry")
    FEATURE_STORE_DIR = os.environ.get("FEATURE_STORE_DIR", "./ml_engine/feature_store")
    MODEL_SERVING_URL = os.environ.get("MODEL_SERVING_URL", "")
    LSTM_SEQ_LEN = 60
    LSTM_FORECAST_DAYS = 30
    XGBOOST_N_ESTIMATORS = 500
    TRANSFORMER_D_MODEL = 128
    TRANSFORMER_N_HEADS = 8
    TRANSFORMER_N_LAYERS = 4
    RL_TRAINING_STEPS = 100_000
    ENSEMBLE_MODELS = ["lstm", "xgboost", "transformer"]
    ENSEMBLE_WEIGHTS = {"lstm": 0.35, "xgboost": 0.35, "transformer": 0.30}
    MC_DROPOUT_PASSES = 50
    ANOMALY_CONTAMINATION = 0.05
    FACTOR_MODEL_FACTORS = ["market", "size", "value", "momentum", "quality", "volatility"]

    # ── Risk Engine ───────────────────────────────────────────────────────
    VAR_CONFIDENCE_LEVEL = 0.95
    CVAR_CONFIDENCE_LEVEL = 0.99
    VAR_LOOKBACK_DAYS = 252
    CORRELATION_WINDOW = 60
    MAX_POSITION_SIZE = 0.20
    RISK_FREE_RATE = 0.065

    # ── Options / Derivatives ─────────────────────────────────────────────
    BLACK_SCHOLES_STEPS = 100
    BINOMIAL_TREE_STEPS = 200
    IV_SURFACE_STRIKES = 20
    IV_SURFACE_EXPIRIES = 6
    RISK_REVERSAL_STRIKES = [0.1, 0.25, 0.5, 0.75, 0.9]

    # ── Feature Flags ─────────────────────────────────────────────────────
    FEATURE_REALTIME_QUOTES = True
    FEATURE_OPTIONS_CHAIN = True
    FEATURE_DERIVATIVES = True
    FEATURE_PORTFOLIO = True
    FEATURE_RISK_ENGINE = True
    FEATURE_ALERTS = True
    FEATURE_SOCIAL_SENTIMENT = True
    FEATURE_REINFORCEMENT_LEARN = False
    FEATURE_TRANSFORMER_MODEL = True
    FEATURE_FACTOR_MODEL = True
    FEATURE_ANOMALY_DETECTION = True
    FEATURE_PAPER_TRADING = True
    FEATURE_AI_CHAT = True
    FEATURE_MULTI_ASSET = True

    # ── Observability ─────────────────────────────────────────────────────
    SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
    PROMETHEUS_ENABLED = True
    OTEL_ENABLED = bool(os.environ.get("OTEL_ENDPOINT"))
    OTEL_ENDPOINT = os.environ.get("OTEL_ENDPOINT", "")
    LOG_LEVEL = "INFO"
    LOG_FORMAT = "json"

    # ── Circuit Breakers ──────────────────────────────────────────────────
    CB_YFINANCE_FAIL_MAX = 5
    CB_YFINANCE_RESET = 60
    CB_NEWSAPI_FAIL_MAX = 3
    CB_NEWSAPI_RESET = 120
    CB_ALPHAVANTAGE_FAIL_MAX = 3
    CB_ALPHAVANTAGE_RESET = 300
    CB_NSE_FAIL_MAX = 5
    CB_NSE_RESET = 30

    # ── Compression ───────────────────────────────────────────────────────
    COMPRESS_ALGORITHM = "gzip"
    COMPRESS_LEVEL = 6
    COMPRESS_MIN_SIZE = 500

    # ── Universe ──────────────────────────────────────────────────────────
    NIFTY50_SYMBOLS = [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
        "KOTAKBANK.NS", "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BAJFINANCE.NS",
        "ADANIENT.NS", "WIPRO.NS", "AXISBANK.NS", "MARUTI.NS", "TITAN.NS",
        "LTIM.NS", "HCLTECH.NS", "SUNPHARMA.NS", "NESTLEIND.NS", "POWERGRID.NS",
        "NTPC.NS", "ONGC.NS", "COALINDIA.NS", "BPCL.NS", "TECHM.NS",
        "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS", "BRITANNIA.NS", "EICHERMOT.NS",
        "BAJAJFINSV.NS", "TATASTEEL.NS", "JSWSTEEL.NS", "HINDALCO.NS", "GRASIM.NS",
        "INDUSINDBK.NS", "TATACONSUM.NS", "ULTRACEMCO.NS", "APOLLOHOSP.NS", "ASIANPAINT.NS",
        "HDFCLIFE.NS", "SBILIFE.NS", "BHARTIARTL.NS", "PIDILITIND.NS", "HEROMOTOCO.NS",
        "M&M.NS", "SHREECEM.NS", "ADANIPORTS.NS", "TATACOMM.NS", "BAJAJ-AUTO.NS",
    ]
    NIFTY_NEXT50 = [
        "ZOMATO.NS", "PAYTM.NS", "NYKAA.NS", "POLICYBZR.NS", "DELHIVERY.NS",
        "ADANIGREEN.NS", "ADANITRANS.NS", "ADANIPOWER.NS", "VEDL.NS", "SAIL.NS",
        "BHEL.NS", "IOC.NS", "CONCOR.NS", "NMDC.NS", "RECLTD.NS",
    ]
    CRYPTO_SYMBOLS = ["BTC-USD", "ETH-USD", "BNB-USD", "SOL-USD", "ADA-USD"]
    COMMODITY_SYMBOLS = ["GC=F", "SI=F", "CL=F", "NG=F", "ZW=F"]
    FX_SYMBOLS = ["USDINR=X", "EURINR=X", "GBPINR=X", "JPYINR=X"]
    INDEX_SYMBOLS = ["^NSEI", "^BSESN", "^NSEBANK", "^CNXIT", "^INDIAVIX", "^GSPC", "^DJI", "^IXIC", "^HSI", "^N225"]


class DevelopmentConfig(BaseConfig):
    DEBUG = True
    LOG_LEVEL = "DEBUG"
    SQLALCHEMY_ECHO = False

    # SQLite for local development
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///stockpro_dev.db")
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
    }

    CACHE_TYPE = "SimpleCache"
    CACHE_DEFAULT_TIMEOUT = 60
    RATELIMIT_DEFAULT = "9999/hour"
    RATELIMIT_ENABLED = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    MC_DROPOUT_PASSES = 10
    XGBOOST_N_ESTIMATORS = 100
    PROMETHEUS_ENABLED = False


class TestingConfig(BaseConfig):
    TESTING = True
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    CACHE_TYPE = "SimpleCache"
    CELERY_TASK_ALWAYS_EAGER = True
    RATELIMIT_ENABLED = False
    PROMETHEUS_ENABLED = False
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    MC_DROPOUT_PASSES = 5
    XGBOOST_N_ESTIMATORS = 50
    LSTM_FORECAST_DAYS = 7


class StagingConfig(BaseConfig):
    DEBUG = False
    LOG_LEVEL = "INFO"
    ENVIRONMENT = "staging"


class ProductionConfig(BaseConfig):
    DEBUG = False
    LOG_LEVEL = "WARNING"
    ENVIRONMENT = "production"
    SQLALCHEMY_ENGINE_OPTIONS = {
        **BaseConfig.SQLALCHEMY_ENGINE_OPTIONS,
        "pool_size": 30,
        "max_overflow": 60,
    }
    SQLALCHEMY_RECORD_QUERIES = False
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    PREFERRED_URL_SCHEME = "https"


class DisasterRecoveryConfig(ProductionConfig):
    ENVIRONMENT = "dr"
    READONLY_MODE = True


config_map = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "staging": StagingConfig,
    "production": ProductionConfig,
    "dr": DisasterRecoveryConfig,
    "default": DevelopmentConfig,
}
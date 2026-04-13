"""
StockPro Ultimate — Enterprise Flask Application Factory
=========================================================
Architecture:
 - Flask + Blueprints + Application Factory pattern
 - Flask-SQLAlchemy
 - Flask-SocketIO
 - Flask-Caching
 - Flask-JWT-Extended + OAuth2
 - Flask-Limiter
 - Flask-Migrate
 - Celery + Redis
 - OpenTelemetry
 - Prometheus
 - Sentry
"""
import os
import time
from flask import Flask, request, g, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_compress import Compress
from celery import Celery
from loguru import logger


db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cache = Cache()
limiter = Limiter(key_func=get_remote_address)
socketio = SocketIO()
celery = Celery()
compress = Compress()

_tracer = None
_metrics = None


def create_app(config_name: str = "production") -> Flask:
    app = Flask(__name__, instance_relative_config=True)

    from app.core.config import config_map
    app.config.from_object(config_map[config_name])

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cache.init_app(app)
    limiter.init_app(app)
    compress.init_app(app)

    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["ALLOWED_ORIGINS"]}},
        supports_credentials=True,
    )

    socketio.init_app(
        app,
        cors_allowed_origins="*",
        message_queue=app.config["REDIS_URL"],
        async_mode="eventlet",
        ping_timeout=60,
        ping_interval=25,
        max_http_buffer_size=10_000_000,
    )

    _init_observability(app)
    _init_celery(app)
    _register_blueprints(app)
    _register_error_handlers(app)
    _register_hooks(app)
    _register_system_routes(app)

    logger.info(f"StockPro Ultimate started [{config_name}]")
    return app


def _init_observability(app: Flask):
    global _tracer, _metrics

    if app.config.get("SENTRY_DSN"):
        import sentry_sdk
        from sentry_sdk.integrations.flask import FlaskIntegration
        from sentry_sdk.integrations.celery import CeleryIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=app.config["SENTRY_DSN"],
            integrations=[
                FlaskIntegration(),
                CeleryIntegration(),
                SqlalchemyIntegration(),
            ],
            traces_sample_rate=0.1,
            environment=app.config.get("ENVIRONMENT", "production"),
        )

    if app.config.get("PROMETHEUS_ENABLED", True):
        try:
            from prometheus_flask_exporter import PrometheusMetrics

            _metrics = PrometheusMetrics(app, default_labels={"app": "stockpro"})
            _metrics.info("app_info", "StockPro Ultimate", version=app.config["VERSION"])
        except ImportError:
            logger.warning("prometheus_flask_exporter not installed")

    if app.config.get("OTEL_ENABLED", False):
        try:
            from opentelemetry import trace
            from opentelemetry.sdk.trace import TracerProvider
            from opentelemetry.sdk.trace.export import BatchSpanProcessor
            from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
            from opentelemetry.instrumentation.flask import FlaskInstrumentor

            provider = TracerProvider()
            provider.add_span_processor(
                BatchSpanProcessor(
                    OTLPSpanExporter(endpoint=app.config.get("OTEL_ENDPOINT"))
                )
            )
            trace.set_tracer_provider(provider)
            FlaskInstrumentor().instrument_app(app)
            _tracer = trace.get_tracer(__name__)
        except ImportError:
            logger.warning("OpenTelemetry not installed")


def _init_celery(app: Flask):
    celery.conf.update(
        broker_url=app.config["CELERY_BROKER_URL"],
        result_backend=app.config["CELERY_RESULT_BACKEND"],
        task_serializer="json",
        result_serializer="json",
        accept_content=["json"],
        timezone="Asia/Kolkata",
        enable_utc=True,
        worker_prefetch_multiplier=1,
        task_acks_late=True,
        task_reject_on_worker_lost=True,
        beat_schedule=app.config.get("CELERY_BEAT_SCHEDULE", {}),
        task_routes={
            "app.tasks.ml_tasks.*": {"queue": "ml"},
            "app.tasks.data_tasks.*": {"queue": "data"},
            "app.tasks.alert_tasks.*": {"queue": "alerts"},
            "app.tasks.portfolio_tasks.*": {"queue": "portfolio"},
            "app.tasks.report_tasks.*": {"queue": "reports"},
        },
    )

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask


def _register_blueprints(app: Flask):
    from app.api.routes import (
        auth_bp,
        stocks_bp,
        analysis_bp,
        prediction_bp,
        screener_bp,
        news_bp,
        watchlist_bp,
        backtest_bp,
        portfolio_bp,
        alerts_bp,
        options_bp,
        derivatives_bp,
        social_bp,
        risk_bp,
        admin_bp,
        webhooks_bp,
    )

    prefix = "/api/v3"
    blueprints = [
        (auth_bp, f"{prefix}/auth"),
        (stocks_bp, f"{prefix}/stocks"),
        (analysis_bp, f"{prefix}/analysis"),
        (prediction_bp, f"{prefix}/predict"),
        (screener_bp, f"{prefix}/screener"),
        (news_bp, f"{prefix}/news"),
        (watchlist_bp, f"{prefix}/watchlist"),
        (backtest_bp, f"{prefix}/backtest"),
        (portfolio_bp, f"{prefix}/portfolio"),
        (alerts_bp, f"{prefix}/alerts"),
        (options_bp, f"{prefix}/options"),
        (derivatives_bp, f"{prefix}/derivatives"),
        (social_bp, f"{prefix}/social"),
        (risk_bp, f"{prefix}/risk"),
        (admin_bp, f"{prefix}/admin"),
        (webhooks_bp, f"{prefix}/webhooks"),
    ]

    for bp, url in blueprints:
        app.register_blueprint(bp, url_prefix=url)


def _register_error_handlers(app: Flask):
    from werkzeug.exceptions import HTTPException
    from sqlalchemy.exc import OperationalError

    @app.errorhandler(HTTPException)
    def http_error(e):
        return jsonify(
            error=e.name,
            message=e.description,
            code=e.code,
            path=request.path,
        ), e.code

    @app.errorhandler(OperationalError)
    def db_error(e):
        logger.error(f"DB error: {e}")
        return jsonify(error="Database Error", code=503), 503

    @app.errorhandler(Exception)
    def unhandled(e):
        logger.exception(f"Unhandled: {e}")
        return jsonify(
            error="Internal Server Error",
            code=500,
            request_id=getattr(g, "request_id", None),
        ), 500


def _register_hooks(app: Flask):
    import uuid

    @app.before_request
    def before():
        g.request_id = str(uuid.uuid4())[:8]
        g.start_time = time.time()
        g.user_id = None

    @app.after_request
    def after(response):
        elapsed = (time.time() - g.start_time) * 1000
        response.headers["X-Request-ID"] = g.request_id
        response.headers["X-Response-Time"] = f"{elapsed:.1f}ms"
        response.headers["X-API-Version"] = app.config["VERSION"]
        if elapsed > 2000:
            logger.warning(f"SLOW {request.method} {request.path}: {elapsed:.0f}ms")
        return response


def _register_system_routes(app: Flask):
    @app.get("/health")
    def health():
        return jsonify(status="ok", version=app.config["VERSION"])

    @app.get("/health/deep")
    def deep_health():
        from app.core.health import DeepHealthChecker
        return jsonify(DeepHealthChecker.check_all())

    @app.get("/metrics/summary")
    def metrics_summary():
        from app.core.metrics import get_system_metrics
        return jsonify(get_system_metrics())

    @app.get("/api/v3/openapi.json")
    def openapi():
        from app.api.openapi import generate_spec
        return jsonify(generate_spec())
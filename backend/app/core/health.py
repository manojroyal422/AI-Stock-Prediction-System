"""Deep health checks for all services."""
import redis as _redis
from flask import current_app
from app import db

class DeepHealthChecker:
    @staticmethod
    def check_all():
        status = {}
        try: db.session.execute(db.text("SELECT 1")); status["database"] = "ok"
        except Exception as e: status["database"] = f"error: {str(e)[:50]}"
        try:
            r = _redis.from_url(current_app.config["REDIS_URL"]); r.ping()
            status["redis"] = "ok"
        except Exception as e: status["redis"] = f"error: {str(e)[:50]}"
        status["version"] = current_app.config["VERSION"]
        status["all_ok"] = all(v=="ok" for k,v in status.items() if k not in ("version","all_ok"))
        return status

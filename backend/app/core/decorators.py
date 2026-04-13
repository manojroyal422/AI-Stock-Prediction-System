"""Route decorators for tier checks."""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt
from app.models import UserTier

TIER_ORDER = {"FREE":0,"PRO":1,"ENTERPRISE":2,"INTERNAL":3}

def require_tier(min_tier: str):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            claims  = get_jwt()
            tier    = claims.get("tier","FREE")
            if TIER_ORDER.get(tier,0) < TIER_ORDER.get(min_tier,0):
                return jsonify(error=f"Requires {min_tier} tier"), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator

def rate_limit_by_tier(limits: dict):
    def decorator(f):
        return f   # Handled by Flask-Limiter dynamically
    return decorator

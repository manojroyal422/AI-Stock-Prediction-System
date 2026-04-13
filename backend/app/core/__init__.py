from flask import Blueprint, jsonify

api_v1_bp = Blueprint('api_v1', __name__, url_prefix='/api/v1')

@api_v1_bp.route('/health')
def health():
    return jsonify({"status": "healthy", "version": "3.0.0"})

@api_v1_bp.route('/stocks/top-movers')
def top_movers():
    return jsonify({"nifty50_gainers": [], "losers": []})

@api_v1_bp.route('/stocks/market-summary')
def market_summary():
    return jsonify({
        "nifty": {"change": "+1.2%", "value": 24250},
        "sensex": {"change": "+0.8%", "value": 80120}
    })
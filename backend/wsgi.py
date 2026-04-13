"""wsgi.py — Production WSGI + SocketIO entry point."""
import eventlet
eventlet.monkey_patch()

import os
from app import create_app, socketio
# from app.api.websocket.handlers import start_quote_broadcaster  # COMMENTED

app = create_app(os.environ.get("FLASK_ENV", "production"))

with app.app_context():
    from app import db
    db.create_all()
    # start_quote_broadcaster()  # COMMENTED

if __name__ == "__main__":
    socketio.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000)),
        debug=app.config.get("DEBUG", False),
        use_reloader=False
    )
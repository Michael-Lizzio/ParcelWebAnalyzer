import os
from flask import Flask
from .config import Config
from .routes import bp as main_bp


def create_app() -> Flask:
    app = Flask(
        __name__,
        template_folder=os.path.join(os.path.dirname(__file__), "..", "templates"),
        static_folder=os.path.join(os.path.dirname(__file__), "..", "static"),
    )
    app.config.from_object(Config)

    app.register_blueprint(main_bp)

    return app

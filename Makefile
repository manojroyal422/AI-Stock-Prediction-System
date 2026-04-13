# StockPro V2 — Developer Makefile
.PHONY: help dev build up down logs test migrate seed collect train clean

DOCKER_COMPOSE = cd infra/docker && docker compose
BACKEND        = docker compose exec backend
CELERY_WORKER  = docker compose exec celery_worker

help:
	@echo ""
	@echo "StockPro V2 — Available commands"
	@echo "─────────────────────────────────────────────────────"
	@echo "  make dev          Start local dev (no Docker)"
	@echo "  make up           Start all Docker services"
	@echo "  make down         Stop all Docker services"
	@echo "  make build        Rebuild Docker images"
	@echo "  make logs         Tail all logs"
	@echo "  make migrate      Run DB migrations"
	@echo "  make seed         Seed stock metadata"
	@echo "  make test         Run pytest suite"
	@echo "  make collect      Collect OHLCV data for Nifty50"
	@echo "  make features     Build ML feature store"
	@echo "  make train        Train XGBoost + LSTM for top 5 stocks"
	@echo "  make clean        Remove all containers + volumes"
	@echo ""

# ── Docker ────────────────────────────────────────────────────────────────────

up:
	cp -n .env.example .env 2>/dev/null || true
	$(DOCKER_COMPOSE) up -d
	@echo "✅ StockPro V2 running at http://localhost"
	@echo "   Backend API : http://localhost:8000/api/v2"
	@echo "   Frontend    : http://localhost:3000"
	@echo "   Flower      : http://localhost:5555"
	@echo "   Grafana     : http://localhost:3001"
	@echo "   pgAdmin     : http://localhost:5050"

down:
	$(DOCKER_COMPOSE) down

build:
	$(DOCKER_COMPOSE) build --no-cache

logs:
	$(DOCKER_COMPOSE) logs -f --tail=100

restart:
	$(DOCKER_COMPOSE) restart backend celery_worker celery_beat

# ── Database ──────────────────────────────────────────────────────────────────

migrate:
	$(DOCKER_COMPOSE) exec backend flask db upgrade
	@echo "✅ Migrations applied"

migrate-create:
	$(DOCKER_COMPOSE) exec backend flask db migrate -m "$(msg)"

migrate-local:
	cd backend && flask db upgrade

# ── Data collection ───────────────────────────────────────────────────────────

collect:
	@echo "📥 Collecting OHLCV data for Nifty50..."
	cd data_engine/collectors && python ohlcv_collector.py --symbol all --interval 1d
	@echo "✅ Data collection complete"

collect-all-intervals:
	cd data_engine/collectors && python ohlcv_collector.py --symbol all --interval 1d
	cd data_engine/collectors && python ohlcv_collector.py --symbol all --interval 1wk

features:
	@echo "⚙️  Building feature store..."
	cd data_engine/collectors && python ohlcv_collector.py --features
	@echo "✅ Feature store built"

# ── ML Training ───────────────────────────────────────────────────────────────

train:
	@echo "🤖 Training models for top 5 Nifty stocks..."
	cd ml_engine && python training/train_all.py --symbols RELIANCE.NS TCS.NS INFY.NS HDFCBANK.NS ICICIBANK.NS
	@echo "✅ Models trained and registered"

train-symbol:
	cd ml_engine && python training/train_all.py --symbols $(sym)

# ── Testing ───────────────────────────────────────────────────────────────────

test:
	cd backend && python -m pytest tests/ -v --tb=short

test-cov:
	cd backend && python -m pytest tests/ -v --cov=app --cov-report=html
	@echo "📊 Coverage report: backend/htmlcov/index.html"

test-unit:
	cd backend && python -m pytest tests/unit/ -v

test-integration:
	cd backend && python -m pytest tests/integration/ -v

# ── Local Development (no Docker) ────────────────────────────────────────────

dev-backend:
	@echo "Starting Postgres + Redis in Docker..."
	docker run -d --name sp_db    -p 5432:5432 -e POSTGRES_USER=stockuser -e POSTGRES_PASSWORD=stockpass -e POSTGRES_DB=stockpro postgres:16-alpine 2>/dev/null || true
	docker run -d --name sp_redis -p 6379:6379 redis:7-alpine 2>/dev/null || true
	cd backend && FLASK_ENV=development python wsgi.py

dev-frontend:
	cd frontend && npm install && npm run dev

dev-celery:
	cd backend && celery -A wsgi.celery worker -l info -c 2

dev-beat:
	cd backend && celery -A wsgi.celery beat -l info

# ── Utilities ─────────────────────────────────────────────────────────────────

seed:
	$(DOCKER_COMPOSE) exec backend python -c "from app.tasks import refresh_market_data; refresh_market_data()"

flush-cache:
	$(DOCKER_COMPOSE) exec redis redis-cli FLUSHDB
	@echo "✅ Cache flushed"

shell:
	$(DOCKER_COMPOSE) exec backend flask shell

psql:
	$(DOCKER_COMPOSE) exec db psql -U stockuser -d stockpro

redis-cli:
	$(DOCKER_COMPOSE) exec redis redis-cli

flower:
	@echo "🌸 Flower available at http://localhost:5555"
	$(DOCKER_COMPOSE) exec celery_worker celery -A wsgi.celery flower --port=5555

lint:
	cd backend && python -m ruff check app/ && echo "✅ Lint passed"

format:
	cd backend && python -m ruff format app/

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean:
	$(DOCKER_COMPOSE) down -v --remove-orphans
	docker system prune -f
	@echo "✅ Cleaned"

clean-models:
	rm -rf ml_engine/registry/*.json ml_engine/registry/*.h5 ml_engine/registry/*.pkl
	@echo "✅ Model registry cleared"

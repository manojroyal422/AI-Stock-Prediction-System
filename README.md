# StockPro Ultimate — Institutional Grade Indian Stock Platform

The most advanced open-source Indian stock market platform. Built with Flask, ML/AI, real-time data, options analytics, risk engine, and social trading.

## Architecture Highlights

### Backend (Flask)
- **Application Factory** with 16 blueprints, 80+ REST endpoints
- **Flask-SocketIO** real-time quotes, alerts, and analysis streaming
- **18 Celery beat tasks** running market data, ML inference, alert monitoring
- **5 environment configs**: dev, test, staging, production, DR failover
- **JWT + OAuth2** (Google, GitHub), tier-based access (Free/Pro/Enterprise)
- **Circuit breakers** per external API (yfinance, AlphaVantage, Polygon, NewsAPI)
- **Rate limiting** per tier (Redis token bucket)
- **OpenTelemetry** distributed tracing + Prometheus metrics

### Database (20 ORM models)
User, JWTTokenBlocklist, APIKey, StockMeta, PriceData, TechnicalCache,
Portfolio, Trade, PortfolioSnapshot, PortfolioRisk, Watchlist,
Alert, OptionsSnapshot, IVSurface, MLModelRecord, Prediction,
Anomaly, SocialPost, ExternalSentiment, BacktestRun, AIChatSession,
AIChatMessage, Notification, AuditLog, Webhook

### ML Engine
- **LSTM + Bahdanau Attention** + MC Dropout (50 passes) → price forecast with 95% CI
- **XGBoost** (500 trees, 150+ features) → direction classification
- **Temporal Fusion Transformer** → market regime (BULL/BEAR/SIDEWAYS/VOLATILE)
- **PPO Reinforcement Learning** agent (Stable-Baselines3 + custom gym env)
- **Isolation Forest + LSTM Autoencoder** → anomaly detection
- **Fama-French Factor Model** → portfolio factor exposures
- **Model Registry** with version control, A/B promotion, auto-promote by accuracy
- **Model Evaluation Pipeline** with OOS accuracy, AUC-ROC, MAPE, directional accuracy

### Risk Engine (Institutional Grade)
- **VaR** (Historical + Parametric + Monte Carlo 10K simulations)
- **CVaR/Expected Shortfall** at 95% and 99%
- **Stress Testing**: 5 scenarios (2008, COVID, Demonetization, Rate Hike, 10-sigma)
- **Sharpe, Sortino, Calmar, Treynor, Information Ratio**
- **Maximum Drawdown** duration + recovery time
- **Correlation matrix** + HHI concentration index
- **Liquidity risk**: days-to-liquidate per position
- **Factor exposure**: market beta, alpha, momentum, volatility
- **Omega ratio, Tail ratio, Ulcer index**

### Options & Derivatives Engine
- **Black-Scholes** pricing for European options
- **Binomial Tree (CRR)** for American options
- **Full Greeks**: Delta, Gamma, Theta, Vega, Rho + Charm, Vanna, Volga, Speed, Color
- **Implied Volatility** (Brent's method, robust)
- **IV Surface** construction from options chain
- **8 Options Strategies**: payoff diagrams at expiry
- **Portfolio Greeks** aggregation

### AI Financial Assistant
- Integrated with **Claude claude-sonnet-4-20250514**
- Context-aware: injects portfolio, market data, technical signals
- Understands Indian taxation (STCG/LTCG, STT, DDT)
- **Natural language screener**: "find cheap IT stocks with good ROE" → JSON params
- **Structured trade ideas** with entry/target/SL/risk-reward
- Streaming responses via SSE
- Session memory (20-turn context)

### Data Engine
- **Multi-source**: yfinance → AlphaVantage → Polygon (fallback chain)
- **Redis Streams** pub/sub (Kafka-lite) for real-time events
- **Parquet feature store** with 150+ pre-computed indicators
- **Incremental updates** — only fetches missing days
- **Data quality gate** — zero price check, outlier detection, deduplication
- **Multi-interval**: 1m, 5m, 15m, 1h, 1d, 1wk

### Social Trading
- Post analysis, trade ideas with verified accuracy tracking
- Leaderboard by prediction accuracy
- Reddit + Twitter sentiment aggregation per symbol
- Hourly sentiment timeline per stock

## Quick Start

```bash
git clone <repo> stockpro-ultimate
cd stockpro-ultimate
cp .env.example .env   # fill in API keys
make up
```

| Service     | URL                                |
|-------------|-------------------------------------|
| App         | http://localhost (Nginx)            |
| API Docs    | http://localhost:8000/api/v3/openapi.json |
| Flower      | http://localhost:5555               |
| Grafana     | http://localhost:3001               |
| pgAdmin     | http://localhost:5050               |
| Prometheus  | http://localhost:9090               |

## API v3 Highlights

```
POST /api/v3/auth/register
POST /api/v3/auth/login              → { access_token, refresh_token }
GET  /api/v3/stocks/{sym}/ohlcv
GET  /api/v3/stocks/{sym}/options
GET  /api/v3/analysis/{sym}/regime   → BULL/BEAR/SIDEWAYS/VOLATILE
GET  /api/v3/analysis/{sym}/anomalies
GET  /api/v3/predict/{sym}/rl-action → PPO RL agent recommendation [Enterprise]
GET  /api/v3/predict/{sym}/ensemble  → LSTM+XGB+Transformer ensemble [Pro]
POST /api/v3/screener/ai-search      → natural language → screener [Pro]
POST /api/v3/options/price           → full BS pricing + all Greeks
POST /api/v3/options/implied-volatility
POST /api/v3/options/strategy-payoff → multi-leg payoff diagram
POST /api/v3/risk/portfolio-var      → VaR + CVaR + stress tests
POST /api/v3/derivatives/binomial-price → American option pricing
GET  /api/v3/portfolio/{id}/risk     → full risk report
POST /api/v3/backtest/run            → 8 strategies + Sharpe/Sortino/Calmar
GET  /api/v3/social/leaderboard      → top traders by accuracy
POST /api/v3/webhooks/               → create alert webhook
```

## User Tiers

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| API calls | 100/hr | 1000/hr | 10000/hr |
| Forecast days | 7 | 30 | 30 |
| Ensemble prediction | ❌ | ✅ | ✅ |
| AI screener | ❌ | ✅ | ✅ |
| RL agent | ❌ | ❌ | ✅ |
| Risk engine | Basic | Full | Full + Stress |
| Alerts | 5 | 50 | Unlimited |
| Portfolios | 1 | 10 | Unlimited |
output 
<img width="1842" height="792" alt="Screenshot 2026-04-13 161928" src="https://github.com/user-attachments/assets/7edf6cfd-708e-4a3f-ac2b-ce2c678339cd" />
<img width="1705" height="608" alt="Screenshot 2026-04-13 161937" src="https://github.com/user-attachments/assets/918eb8d2-c25c-4327-b9ae-c008af8e97f8" />
<img width="1879" height="824" alt="Screenshot 2026-04-13 161954" src="https://github.com/user-attachments/assets/cd40549b-19d4-4986-94d7-de70fc217c6f" />
<img width="1815" height="810" alt="Screenshot 2026-04-13 162020" src="https://github.com/user-attachments/assets/ffa5f2ca-1be2-4d13-955b-24b39adbca3e" />


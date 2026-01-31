# TradePulse Backend Architecture Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move all business logic to a secure backend, making the mobile app a thin client

**Architecture:** Node.js + Fastify API server with PostgreSQL database, Redis caching, WebSocket real-time delivery

**Tech Stack:** Fastify, PostgreSQL, Redis, JWT, Argon2, Zod, Docker, Dokploy

---

## 1. Overall Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React Native)                     │
│  • UI/UX logic only                                             │
│  • Stores only access token (in memory)                         │
│  • Refresh token in Secure Storage                              │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTPS/WSS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NGINX (Reverse Proxy)                       │
│  • SSL termination          • Rate limiting                      │
│  • DDoS protection          • Request filtering                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NODE.JS API SERVER (Fastify)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Auth Module │  │ Signals     │  │ Pumps       │              │
│  │ (JWT+2FA)   │  │ Generator   │  │ Detector    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Portfolio   │  │ AI Analysis │  │ Liquidation │              │
│  │ Manager     │  │ (OpenAI)    │  │ Calculator  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │     Redis       │  │ Exchange APIs   │
│  (Primary DB)   │  │ (Cache/PubSub)  │  │ (Binance,etc)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

**Key Principles:**
- Client contains no business logic — only displays data
- All calculations, validation, signal generation — on server
- Exchange API keys stored only on server
- Redis for caching and real-time pub/sub

---

## 2. Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PROTECTION LAYERS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. NETWORK LAYER (Nginx + Fail2Ban)                            │
│     • Rate limiting: 100 req/min for API, 10 req/min for auth   │
│     • IP ban after 5 failed login attempts                      │
│     • DDoS protection (connection limits, request throttling)   │
│     • Block suspicious User-Agents                              │
│                                                                  │
│  2. TRANSPORT LAYER                                             │
│     • TLS 1.3 only (Let's Encrypt)                              │
│     • HSTS, Certificate pinning in mobile app                   │
│     • Secure WebSocket (WSS)                                    │
│                                                                  │
│  3. APPLICATION LAYER (Fastify)                                 │
│     • Helmet.js — security headers                              │
│     • CORS whitelist — only our app                             │
│     • Input validation (Zod schemas)                            │
│     • SQL injection protection (parameterized queries)          │
│     • XSS protection (output encoding)                          │
│                                                                  │
│  4. AUTHENTICATION                                              │
│     • Argon2id for password hashing                             │
│     • Access Token: 15 min, in client memory                    │
│     • Refresh Token: 7 days, httpOnly secure cookie             │
│     • 2FA via TOTP (Google Authenticator)                       │
│     • Device fingerprinting                                     │
│                                                                  │
│  5. MONITORING AND AUDIT                                        │
│     • Logging all user actions                                  │
│     • Anomaly detection (unusual activity)                      │
│     • Honeypot endpoints (traps for attackers)                  │
│     • Alerts on suspicious activity                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Secret Storage:**
- All API keys, DB credentials — in Dokploy environment variables
- No secrets in code or git
- OpenAI API key — on server only, client doesn't know

---

## 3. Database Schema

```sql
-- USERS AND AUTHENTICATION
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    subscription VARCHAR(20) DEFAULT 'free' CHECK (subscription IN ('free', 'pro', 'premium', 'vip')),
    subscription_expires_at TIMESTAMP,
    totp_secret VARCHAR(255),
    totp_enabled BOOLEAN DEFAULT false,
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- TRADING SIGNALS
CREATE TABLE signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,
    exchange VARCHAR(20) NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('buy', 'sell')),
    entry_price DECIMAL(20,8) NOT NULL,
    stop_loss DECIMAL(20,8) NOT NULL,
    take_profit_1 DECIMAL(20,8),
    take_profit_2 DECIMAL(20,8),
    take_profit_3 DECIMAL(20,8),
    ai_confidence INTEGER CHECK (ai_confidence >= 0 AND ai_confidence <= 100),
    ai_triggers JSONB,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'cancelled')),
    result_pnl DECIMAL(10,2),
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now(),
    min_tier VARCHAR(20) DEFAULT 'free'
);

-- USER PORTFOLIOS
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    quantity DECIMAL(20,8) NOT NULL,
    avg_buy_price DECIMAL(20,8) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP,
    UNIQUE(user_id, symbol)
);

-- AUDIT AND SECURITY
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    ip_address INET NOT NULL,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE blocked_ips (
    ip_address INET PRIMARY KEY,
    reason TEXT,
    blocked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_signals_status_created ON signals(status, created_at);
CREATE INDEX idx_audit_user_created ON audit_logs(user_id, created_at);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

---

## 4. API Structure

### REST Endpoints

```
AUTH (public)
├─ POST   /api/v1/auth/register
├─ POST   /api/v1/auth/login
├─ POST   /api/v1/auth/refresh
├─ POST   /api/v1/auth/logout
├─ POST   /api/v1/auth/2fa/setup
├─ POST   /api/v1/auth/2fa/verify
└─ POST   /api/v1/auth/password/reset

USER (protected)
├─ GET    /api/v1/user/me
├─ PATCH  /api/v1/user/me
├─ GET    /api/v1/user/sessions
└─ DELETE /api/v1/user/sessions/:id

SIGNALS (protected, tier-based)
├─ GET    /api/v1/signals
├─ GET    /api/v1/signals/:id
├─ GET    /api/v1/signals/stats
└─ GET    /api/v1/signals/history

MARKET DATA (protected)
├─ GET    /api/v1/market/tickers
├─ GET    /api/v1/market/ticker/:symbol
├─ GET    /api/v1/market/orderbook/:symbol
├─ GET    /api/v1/market/candles/:symbol
└─ GET    /api/v1/market/liquidations/:symbol

PORTFOLIO (protected)
├─ GET    /api/v1/portfolio
├─ POST   /api/v1/portfolio/asset
├─ PATCH  /api/v1/portfolio/asset/:id
└─ DELETE /api/v1/portfolio/asset/:id

AI ANALYSIS (protected, pro+)
├─ POST   /api/v1/ai/analyze/:symbol
└─ POST   /api/v1/ai/chat

NEWS (protected)
└─ GET    /api/v1/news
```

### WebSocket Events

```
CONNECTION
wss://api.example.com/ws?token=<access_token>

CLIENT → SERVER
├─ subscribe     { channels: ['tickers', 'signals', 'pumps'] }
├─ unsubscribe   { channels: ['tickers'] }
└─ ping          { }

SERVER → CLIENT
├─ ticker        { symbol, price, change24h, volume }
├─ signal        { id, symbol, direction, entry, ... }
├─ pump          { symbol, exchange, changePercent, status }
├─ notification  { type, title, message }
└─ pong          { }
```

### Middleware Chain

```
Request → RateLimit → Auth → TierCheck → Validation → Handler → Response
```

---

## 5. Backend Project Structure

```
backend/
├── docker-compose.yml
├── Dockerfile
├── .env.example
│
├── src/
│   ├── index.ts
│   ├── app.ts
│   │
│   ├── config/
│   │   ├── index.ts
│   │   ├── database.ts
│   │   └── redis.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schema.ts
│   │   │   ├── auth.routes.ts
│   │   │   └── strategies/
│   │   │       ├── jwt.strategy.ts
│   │   │       └── totp.strategy.ts
│   │   │
│   │   ├── signals/
│   │   │   ├── signals.controller.ts
│   │   │   ├── signals.service.ts
│   │   │   ├── signals.schema.ts
│   │   │   └── signals.generator.ts
│   │   │
│   │   ├── pumps/
│   │   │   ├── pumps.controller.ts
│   │   │   ├── pumps.service.ts
│   │   │   └── pumps.detector.ts
│   │   │
│   │   ├── market/
│   │   │   ├── market.controller.ts
│   │   │   ├── market.service.ts
│   │   │   └── exchanges/
│   │   │       ├── base.exchange.ts
│   │   │       ├── binance.ts
│   │   │       ├── bybit.ts
│   │   │       ├── okx.ts
│   │   │       └── mexc.ts
│   │   │
│   │   ├── portfolio/
│   │   │   ├── portfolio.controller.ts
│   │   │   └── portfolio.service.ts
│   │   │
│   │   ├── ai/
│   │   │   ├── ai.controller.ts
│   │   │   ├── ai.service.ts
│   │   │   └── prompts/
│   │   │
│   │   └── user/
│   │       ├── user.controller.ts
│   │       └── user.service.ts
│   │
│   ├── websocket/
│   │   ├── ws.server.ts
│   │   ├── ws.auth.ts
│   │   ├── ws.channels.ts
│   │   └── ws.handlers.ts
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts
│   │   ├── tier.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   ├── security.middleware.ts
│   │   └── audit.middleware.ts
│   │
│   ├── db/
│   │   ├── migrations/
│   │   ├── seeds/
│   │   └── queries/
│   │
│   ├── jobs/
│   │   ├── priceAggregator.job.ts
│   │   ├── signalChecker.job.ts
│   │   ├── pumpScanner.job.ts
│   │   └── cleanup.job.ts
│   │
│   ├── utils/
│   │   ├── crypto.ts
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   └── validators.ts
│   │
│   └── types/
│       ├── fastify.d.ts
│       └── index.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── scripts/
    ├── migrate.ts
    └── seed.ts
```

**Key Dependencies:**
```json
{
  "fastify": "^4.x",
  "@fastify/jwt": "^8.x",
  "@fastify/websocket": "^10.x",
  "@fastify/cors": "^9.x",
  "@fastify/helmet": "^11.x",
  "@fastify/rate-limit": "^9.x",
  "pg": "^8.x",
  "redis": "^4.x",
  "zod": "^3.x",
  "argon2": "^0.31.x",
  "otplib": "^12.x",
  "pino": "^8.x",
  "node-cron": "^3.x"
}
```

---

## 6. Mobile App Changes

### Files to Delete (moved to backend)
- `services/pumps/detector.ts`
- `services/signals/generator.ts`
- `services/liquidations/calc.ts`
- `services/ai/openai.ts`
- `services/exchanges/*`

### Files to Refactor
- `services/auth/index.ts` → API calls
- `context/AuthContext.tsx` → Token management

### New Files
- `api/client.ts` — Axios + interceptors
- `api/auth.api.ts` — Auth endpoints
- `api/signals.api.ts` — Signals endpoints
- `api/market.api.ts` — Market data endpoints
- `api/portfolio.api.ts` — Portfolio endpoints
- `api/ai.api.ts` — AI endpoints
- `services/websocket.ts` — WS connection manager
- `utils/secureStorage.ts` — Encrypted token storage

---

## 7. Deployment (Dokploy)

### Docker Compose

```yaml
version: '3.8'

services:
  api:
    build: .
    restart: always
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://user:pass@postgres:5432/tradepulse
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
    networks:
      - internal

  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: tradepulse
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - internal

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - internal

volumes:
  postgres_data:
  redis_data:

networks:
  internal:
```

### Environment Variables

```env
# Database
DB_USER=tradepulse
DB_PASSWORD=<strong-password>
DATABASE_URL=postgresql://tradepulse:pass@postgres:5432/tradepulse

# Redis
REDIS_PASSWORD=<strong-password>
REDIS_URL=redis://:password@redis:6379

# JWT
JWT_SECRET=<64-byte-random-string>
JWT_REFRESH_SECRET=<64-byte-random-string>

# External APIs
OPENAI_API_KEY=sk-...

# Security
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
CORS_ORIGIN=https://tradepulse.app

# App
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

---

## 8. Implementation Phases

### Phase 1: Infrastructure
- 1.1 Initialize Fastify + TypeScript project
- 1.2 Docker Compose (PostgreSQL, Redis)
- 1.3 Database migrations and schema
- 1.4 Logging (Pino) and error handling
- 1.5 Health check endpoint

### Phase 2: Security and Authentication
- 2.1 Registration/login with Argon2id
- 2.2 JWT Access + Refresh tokens
- 2.3 2FA (TOTP) setup and verification
- 2.4 Rate limiting middleware
- 2.5 Audit logging middleware
- 2.6 Honeypot endpoints
- 2.7 IP blocking system

### Phase 3: Market Data
- 3.1 Exchange adapters (Binance, Bybit, OKX, MEXC)
- 3.2 Price aggregator job
- 3.3 Redis caching for tickers
- 3.4 REST endpoints for market data
- 3.5 WebSocket server + channels

### Phase 4: Business Logic
- 4.1 Pump detector service
- 4.2 Signal generator + AI triggers
- 4.3 Liquidation calculator
- 4.4 Portfolio management
- 4.5 AI Analysis (OpenAI integration)

### Phase 5: Mobile App Refactoring
- 5.1 API client with interceptors
- 5.2 Secure token storage
- 5.3 WebSocket connection manager
- 5.4 Remove local business logic
- 5.5 Update all screens to use API
- 5.6 Offline mode handling

### Phase 6: Deployment and Testing
- 6.1 Dokploy setup
- 6.2 CI/CD pipeline
- 6.3 E2E testing
- 6.4 Load testing
- 6.5 Security audit

---

## Summary

This architecture provides:
- **Maximum security**: Multiple protection layers, 2FA, audit logging
- **Scalability**: Stateless API, Redis caching, background jobs
- **Maintainability**: Clean module structure, TypeScript, Zod validation
- **Real-time**: WebSocket for live data delivery
- **Thin client**: Mobile app only displays data, no business logic

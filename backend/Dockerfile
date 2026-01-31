# =============================================================================
# TradePulse Backend - Production Dockerfile
# Multi-stage build with security hardening
# =============================================================================

# Stage 1: Builder
# Compiles TypeScript to JavaScript
FROM node:20-alpine AS builder

# Install build dependencies for native modules (argon2)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first (better layer caching)
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src ./src
COPY tsconfig.json ./

# Build the application
RUN npm run build

# Prune dev dependencies after build
RUN npm prune --production

# =============================================================================
# Stage 2: Production
# Minimal runtime image with security hardening
# =============================================================================
FROM node:20-alpine AS production

# Add labels for container metadata
LABEL org.opencontainers.image.title="TradePulse Backend"
LABEL org.opencontainers.image.description="TradePulse Backend API Server"
LABEL org.opencontainers.image.vendor="TradePulse"
LABEL org.opencontainers.image.source="https://github.com/your-org/trade-alert-app"

# Install runtime dependencies and security updates
RUN apk add --no-cache \
    # Required for argon2 native module
    libstdc++ \
    # Useful for health checks
    wget \
    # Security: Install latest security patches
    && apk upgrade --no-cache \
    # Security: Remove unnecessary packages
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./

# Copy pruned node_modules from builder (with native modules compiled)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Security: Set proper permissions
RUN chmod -R 550 /app && \
    chmod -R 770 /app/dist

# Security: Remove npm cache and unnecessary files
RUN rm -rf /root/.npm /tmp/*

# Switch to non-root user
USER nodejs

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -q --spider http://localhost:3000/health/live || exit 1

# Start the application with Node.js optimizations
CMD ["node", "--enable-source-maps", "--max-old-space-size=384", "dist/index.js"]

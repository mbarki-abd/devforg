# ============================================
# DevForge Agent API
# Multi-stage build for optimized production image
# ============================================

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN pnpm build

# Stage 2: Production
FROM node:20-alpine AS production

# Install system dependencies
RUN apk add --no-cache \
    curl \
    docker-cli \
    openssh-client \
    bash \
    tzdata \
    && rm -rf /var/cache/apk/*

# Set environment
ENV NODE_ENV=production
ENV TZ=UTC

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile || pnpm install --prod

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create directories
RUN mkdir -p /app/credentials /app/logs

# Create non-root user
RUN addgroup -g 1001 -S devforge && \
    adduser -S devforge -u 1001 -G devforge

# Set permissions
RUN chown -R devforge:devforge /app

# Switch to non-root user
USER devforge

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health/live || exit 1

# Start server
CMD ["node", "dist/index.js"]

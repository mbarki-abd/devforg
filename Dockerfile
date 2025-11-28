# ============================================
# DevForge NocoBase 2.x with Custom Plugins
# Multi-stage build for optimized production image
# ============================================

# Stage 1: Build plugins
FROM node:20-alpine AS plugin-builder

WORKDIR /app/plugins

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.14.2 --activate

# Copy plugin source
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY packages/ ./packages/

# Install dependencies and build plugins
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm build

# Stage 2: NocoBase base with plugins
FROM nocobase/nocobase:2.0.0-alpha.47 AS production

# Set environment
ENV NODE_ENV=production
ENV TZ=UTC

# Install additional system dependencies
RUN apk add --no-cache \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy built plugins from builder stage
COPY --from=plugin-builder /app/plugins/packages/plugin-agent-gateway/dist /app/packages/plugins/@devforge/plugin-agent-gateway/dist
COPY --from=plugin-builder /app/plugins/packages/plugin-credentials/dist /app/packages/plugins/@devforge/plugin-credentials/dist
COPY --from=plugin-builder /app/plugins/packages/plugin-executions/dist /app/packages/plugins/@devforge/plugin-executions/dist
COPY --from=plugin-builder /app/plugins/packages/plugin-projects/dist /app/packages/plugins/@devforge/plugin-projects/dist
COPY --from=plugin-builder /app/plugins/packages/plugin-workflows/dist /app/packages/plugins/@devforge/plugin-workflows/dist

# Copy plugin package.json files
COPY --from=plugin-builder /app/plugins/packages/plugin-agent-gateway/package.json /app/packages/plugins/@devforge/plugin-agent-gateway/
COPY --from=plugin-builder /app/plugins/packages/plugin-credentials/package.json /app/packages/plugins/@devforge/plugin-credentials/
COPY --from=plugin-builder /app/plugins/packages/plugin-executions/package.json /app/packages/plugins/@devforge/plugin-executions/
COPY --from=plugin-builder /app/plugins/packages/plugin-projects/package.json /app/packages/plugins/@devforge/plugin-projects/
COPY --from=plugin-builder /app/plugins/packages/plugin-workflows/package.json /app/packages/plugins/@devforge/plugin-workflows/

# Create storage directories
RUN mkdir -p /app/storage/uploads /app/storage/logs

# Set correct permissions
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:80/api/health || exit 1

# Start NocoBase
CMD ["yarn", "start"]

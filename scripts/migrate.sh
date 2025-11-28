#!/bin/bash
# ============================================
# DevForge Migration Script
# Migrate from NocoBase 1.x to 2.x
# ============================================

set -e

echo "=========================================="
echo "DevForge Migration: NocoBase 1.x → 2.x"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/opt/devforge/backups/$(date +%Y%m%d_%H%M%S)"
COMPOSE_FILE="/opt/devforge/docker-compose.yml"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root or with sudo
check_permissions() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run this script as root or with sudo"
        exit 1
    fi
}

# Create backup
create_backup() {
    log_info "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"

    # Backup PostgreSQL database
    log_info "Backing up PostgreSQL database..."
    docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U devforge devforge > "$BACKUP_DIR/database.sql"

    # Backup NocoBase storage
    log_info "Backing up NocoBase storage..."
    docker compose -f "$COMPOSE_FILE" cp nocobase:/app/storage "$BACKUP_DIR/storage"

    # Backup Redis data
    log_info "Backing up Redis data..."
    docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli BGSAVE
    sleep 5
    docker compose -f "$COMPOSE_FILE" cp redis:/data/dump.rdb "$BACKUP_DIR/redis.rdb"

    # Backup current docker-compose and .env
    log_info "Backing up configuration..."
    cp "$COMPOSE_FILE" "$BACKUP_DIR/docker-compose.yml.bak"
    cp /opt/devforge/.env "$BACKUP_DIR/.env.bak" 2>/dev/null || true

    log_info "Backup completed: $BACKUP_DIR"
}

# Stop old services
stop_services() {
    log_info "Stopping existing services..."
    cd /opt/devforge
    docker compose down --remove-orphans
}

# Pull new images
pull_new_images() {
    log_info "Pulling new NocoBase 2.x images..."
    cd /opt/devforge
    docker compose pull
}

# Start new services
start_services() {
    log_info "Starting new services..."
    cd /opt/devforge
    docker compose up -d
}

# Wait for services to be healthy
wait_for_health() {
    log_info "Waiting for services to be healthy..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker compose -f "$COMPOSE_FILE" exec -T nocobase curl -sf http://localhost:80/api/health > /dev/null 2>&1; then
            log_info "NocoBase is healthy!"
            break
        fi
        log_warn "Attempt $attempt/$max_attempts - Waiting for NocoBase..."
        sleep 10
        ((attempt++))
    done

    if [ $attempt -gt $max_attempts ]; then
        log_error "NocoBase failed to become healthy after $max_attempts attempts"
        exit 1
    fi
}

# Run NocoBase upgrade
run_upgrade() {
    log_info "Running NocoBase upgrade..."
    docker compose -f "$COMPOSE_FILE" exec -T nocobase yarn nocobase upgrade
}

# Enable DevForge plugins
enable_plugins() {
    log_info "Enabling DevForge plugins..."

    local plugins=(
        "@devforge/plugin-agent-gateway"
        "@devforge/plugin-credentials"
        "@devforge/plugin-executions"
        "@devforge/plugin-projects"
        "@devforge/plugin-workflows"
    )

    for plugin in "${plugins[@]}"; do
        log_info "Enabling plugin: $plugin"
        docker compose -f "$COMPOSE_FILE" exec -T nocobase yarn nocobase pm enable "$plugin" || log_warn "Failed to enable $plugin"
    done
}

# Verify migration
verify_migration() {
    log_info "Verifying migration..."

    # Check NocoBase health
    if docker compose -f "$COMPOSE_FILE" exec -T nocobase curl -sf http://localhost:80/api/health > /dev/null 2>&1; then
        log_info "✅ NocoBase health check passed"
    else
        log_error "❌ NocoBase health check failed"
        return 1
    fi

    # Check Agent API health
    if docker compose -f "$COMPOSE_FILE" exec -T agent-api curl -sf http://localhost:8080/health/live > /dev/null 2>&1; then
        log_info "✅ Agent API health check passed"
    else
        log_error "❌ Agent API health check failed"
        return 1
    fi

    # Check database connection
    if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U devforge > /dev/null 2>&1; then
        log_info "✅ PostgreSQL health check passed"
    else
        log_error "❌ PostgreSQL health check failed"
        return 1
    fi

    # Check Redis connection
    if docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping > /dev/null 2>&1; then
        log_info "✅ Redis health check passed"
    else
        log_error "❌ Redis health check failed"
        return 1
    fi

    log_info "Migration verification completed successfully!"
}

# Rollback function
rollback() {
    log_error "Migration failed! Rolling back..."

    # Stop new services
    docker compose -f "$COMPOSE_FILE" down

    # Restore database
    if [ -f "$BACKUP_DIR/database.sql" ]; then
        log_info "Restoring database..."
        docker compose -f "$COMPOSE_FILE" up -d postgres
        sleep 10
        docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U devforge devforge < "$BACKUP_DIR/database.sql"
    fi

    # Restore configuration
    if [ -f "$BACKUP_DIR/docker-compose.yml.bak" ]; then
        cp "$BACKUP_DIR/docker-compose.yml.bak" "$COMPOSE_FILE"
    fi

    log_error "Rollback completed. Please check the backup at: $BACKUP_DIR"
    exit 1
}

# Main migration process
main() {
    log_info "Starting DevForge migration..."

    check_permissions

    # Create backup
    create_backup

    # Set trap for rollback on error
    trap rollback ERR

    # Migration steps
    stop_services
    pull_new_images
    start_services
    wait_for_health
    run_upgrade
    enable_plugins
    verify_migration

    # Remove trap
    trap - ERR

    log_info "=========================================="
    log_info "Migration completed successfully!"
    log_info "=========================================="
    log_info "Frontend: https://devforge.ilinqsoft.com"
    log_info "API: https://api.devforge.ilinqsoft.com"
    log_info "Backup location: $BACKUP_DIR"
    log_info "=========================================="
}

# Run main function
main "$@"

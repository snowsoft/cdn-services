#!/bin/sh
set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Check if we're running as the correct user
if [ "$(id -u)" = '0' ]; then
    log_error "Container should not run as root user"
    exit 1
fi

# Environment validation
log_info "Validating environment configuration..."

# Check required environment variables
required_vars="NODE_ENV DATABASE_URL"
for var in $required_vars; do
    if [ -z "$(eval echo \$$var)" ]; then
        log_error "Required environment variable $var is not set"
        exit 1
    fi
done

# Wait for database to be ready
if [ -n "$DATABASE_URL" ]; then
    log_info "Waiting for database connection..."

    # Extract database host and port from DATABASE_URL
    # Format: postgresql://user:password@host:port/database
    DB_HOST=$(echo $DATABASE_URL | sed -E 's/.*@([^:]+):.*/\1/')
    DB_PORT=$(echo $DATABASE_URL | sed -E 's/.*:([0-9]+)\/.*/\1/')

    if [ -f "./scripts/wait-for-it.sh" ]; then
        ./scripts/wait-for-it.sh "$DB_HOST:$DB_PORT" -t 30
    else
        # Simple wait loop if wait-for-it.sh is not available
        counter=0
        until nc -z "$DB_HOST" "$DB_PORT"; do
            counter=$((counter+1))
            if [ $counter -gt 30 ]; then
                log_error "Database connection timeout after 30 seconds"
                exit 1
            fi
            log_info "Waiting for database at $DB_HOST:$DB_PORT... ($counter/30)"
            sleep 1
        done
    fi

    log_success "Database is ready!"
fi

# Run database migrations in production
if [ "$NODE_ENV" = "production" ]; then
    log_info "Running database migrations..."
    if npm run migrate; then
        log_success "Database migrations completed"
    else
        log_error "Database migrations failed"
        exit 1
    fi
fi

# Create necessary directories
log_info "Creating necessary directories..."
mkdir -p /app/logs /app/uploads /app/tmp

# Set up application
log_info "Starting application in $NODE_ENV mode..."

# Handle different environments
case "$NODE_ENV" in
    "production")
        log_info "Optimizing for production..."
        # Precompile assets if needed
        if [ -f "package.json" ] && grep -q "build:assets" package.json; then
            npm run build:assets
        fi
        ;;
    "development")
        log_info "Setting up development environment..."
        # Install dev dependencies if needed
        if [ ! -d "node_modules" ]; then
            npm install
        fi
        ;;
esac

# Health check file
touch /tmp/healthy

# Signal handling for graceful shutdown
trap 'log_info "Received SIGTERM, shutting down gracefully..."; kill -TERM $PID; wait $PID' TERM
trap 'log_info "Received SIGINT, shutting down gracefully..."; kill -INT $PID; wait $PID' INT

# Execute the main command
log_success "Starting application: $@"
exec "$@" &
PID=$!

# Wait for the process
wait $PID
EXIT_CODE=$?

# Clean up
rm -f /tmp/healthy

log_info "Application exited with code $EXIT_CODE"
exit $EXIT_CODE
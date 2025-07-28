# MyApp - Dockerized Application

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/yourusername/cdn-services)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/r/yourusername/cdn-services)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development](#development)
- [Testing](#testing)
- [Production](#production)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🎯 Overview

MyApp is a modern, containerized application built with Node.js, PostgreSQL, and Redis. It features a microservices architecture, automated testing, and comprehensive monitoring.

## ✨ Features

- 🐳 Fully Dockerized with multi-stage builds
- 🔄 Hot reload in development
- 🧪 Automated testing suite (unit, integration, E2E)
- 📊 Built-in monitoring with Prometheus & Grafana
- 🔐 Security-first approach
- 📈 Horizontal scaling ready
- 🚀 CI/CD ready

## 📚 Prerequisites

- Docker >= 20.10
- Docker Compose >= 2.0
- Make (optional, for automation)
- Node.js >= 18 (for local development)

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cdn-services.git
   cd cdn-services
   ```

2. **Copy environment variables**
   ```bash
   cp .env.example .env
   ```

3. **Start the application**
   ```bash
   # Using Make
   make compose-up

   # Or using Docker Compose directly
   docker-compose up -d
   ```

4. **Access the application**
   - Application: http://localhost:3000
   - API Documentation: http://localhost:3000/api-docs
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3001 (admin/admin)

## 💻 Development

### Starting Development Environment

```bash
# Start all development services
docker-compose -f docker-compose.dev.yml up

# Or use Make
make dev
```

### Development URLs
- Application: http://localhost:3000
- Debugger: chrome://inspect (port 9229)
- Database Admin: http://localhost:8080 (Adminer)
- Email Testing: http://localhost:8025 (MailHog)
- Documentation: http://localhost:8090

### Hot Reload

The development setup includes hot reload for both backend and frontend code. Simply save your files and the changes will be reflected immediately.

### Debugging

1. Start the development environment
2. Open Chrome and navigate to `chrome://inspect`
3. Click "inspect" on the Node.js process
4. Set breakpoints in the Sources tab

### Database Migrations

```bash
# Run migrations
docker-compose exec app-dev npm run migrate

# Create new migration
docker-compose exec app-dev npm run migrate:create -- --name add_users_table

# Rollback migration
docker-compose exec app-dev npm run migrate:rollback
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit

# Or use Make
make test

# Run specific test suites
docker-compose -f docker-compose.test.yml run app-test npm run test:unit
docker-compose -f docker-compose.test.yml run app-test npm run test:integration
docker-compose -f docker-compose.test.yml run app-test npm run test:e2e
```

### Test Coverage

After running tests, view coverage reports at: http://localhost:8091

### Writing Tests

- Unit tests: `tests/unit/`
- Integration tests: `tests/integration/`
- E2E tests: `tests/e2e/`

## 🏭 Production

### Building for Production

```bash
# Build production image
make build

# Or manually
docker build -t cdn-services:latest .
```

### Deployment

```bash
# Using Docker Swarm
docker stack deploy -c docker-compose.yml cdn-services

# Using Kubernetes
kubectl apply -f k8s/
```

### Environment Variables

See `.env.example` for all available configuration options.

### Security Considerations

- All containers run as non-root users
- Secrets are managed via Docker Secrets or environment variables
- Regular security scanning with Trivy
- TLS/SSL enabled by default

## 🏗 Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Nginx Proxy   │────▶│   Node.js App   │────▶│   PostgreSQL    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │                 │
                        │      Redis      │
                        │                 │
                        └─────────────────┘
```

### Services

- **app**: Main Node.js application
- **nginx**: Reverse proxy and load balancer
- **db**: PostgreSQL database
- **cache**: Redis cache
- **prometheus**: Metrics collection
- **grafana**: Metrics visualization

## 📖 API Documentation

API documentation is available at `/api-docs` when running the application.

### Example Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Get all users
curl http://localhost:3000/api/users

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

## 🔧 Troubleshooting

### Common Issues

**Container won't start**
```bash
# Check logs
docker-compose logs app

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up
```

**Database connection issues**
```bash
# Check database is running
docker-compose ps db

# Test connection
docker-compose exec db psql -U user -d cdn-services
```

**Port already in use**
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Useful Commands

```bash
# View all logs
make logs

# Access container shell
make shell

# Clean up everything
make clean

# View container resource usage
docker stats
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Follow ESLint rules
- Update documentation
- Keep commits atomic and descriptive

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Your Name - [@yourusername](https://github.com/yourusername)

## 🙏 Acknowledgments

- Docker community for excellent documentation
- Node.js team for the amazing platform
- All contributors who have helped this project grow
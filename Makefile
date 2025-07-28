# Docker Makefile for CDN Services
.PHONY: help build run stop clean logs shell test push pull

# Variables
DOCKER_IMAGE ?= cdn-services
DOCKER_TAG ?= latest
DOCKER_REGISTRY ?= docker.io
FULL_IMAGE_NAME = $(DOCKER_REGISTRY)/$(DOCKER_IMAGE):$(DOCKER_TAG)
CONTAINER_NAME = cdn-services
PORT = 3012

# Colors
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

help: ## Show this help message
	@echo '${GREEN}CDN Services - Docker Management Commands${NC}'
	@echo ''
	@grep -E '^[a-zA-Z_-]+:.*?## .*$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $1, $2}'

build: ## Build Docker image
	@echo "${GREEN}Building Docker image: $(FULL_IMAGE_NAME)${NC}"
	docker build -t $(FULL_IMAGE_NAME) \
		--build-arg BUILD_DATE=`date -u +"%Y-%m-%dT%H:%M:%SZ"` \
		--build-arg VCS_REF=`git rev-parse --short HEAD` \
		.

build-nocache: ## Build Docker image without cache
	@echo "${GREEN}Building Docker image without cache: $(FULL_IMAGE_NAME)${NC}"
	docker build --no-cache -t $(FULL_IMAGE_NAME) .

run: ## Run Docker container
	@echo "${GREEN}Running container: $(CONTAINER_NAME)${NC}"
	docker run -d \
		--name $(CONTAINER_NAME) \
		--env-file .env \
		-p $(PORT):$(PORT) \
		$(FULL_IMAGE_NAME)

run-dev: ## Run container in development mode
	@echo "${GREEN}Running container in dev mode: $(CONTAINER_NAME)${NC}"
	docker run -it --rm \
		--name $(CONTAINER_NAME)-dev \
		--env-file .env.development \
		-p $(PORT):$(PORT) \
		-v $(PWD):/app \
		$(FULL_IMAGE_NAME)

stop: ## Stop running container
	@echo "${YELLOW}Stopping container: $(CONTAINER_NAME)${NC}"
	docker stop $(CONTAINER_NAME) || true

remove: stop ## Remove container
	@echo "${RED}Removing container: $(CONTAINER_NAME)${NC}"
	docker rm $(CONTAINER_NAME) || true

logs: ## Show container logs
	docker logs -f $(CONTAINER_NAME)

shell: ## Open shell in running container
	docker exec -it $(CONTAINER_NAME) /bin/sh

test: ## Run tests in container
	@echo "${GREEN}Running tests in container${NC}"
	docker run --rm \
		--env-file .env.test \
		$(FULL_IMAGE_NAME) \
		npm test

lint: ## Run linter in container
	@echo "${GREEN}Running linter${NC}"
	docker run --rm \
		-v $(PWD):/app \
		$(FULL_IMAGE_NAME) \
		npm run lint

push: ## Push image to registry
	@echo "${GREEN}Pushing image: $(FULL_IMAGE_NAME)${NC}"
	docker push $(FULL_IMAGE_NAME)

pull: ## Pull image from registry
	@echo "${GREEN}Pulling image: $(FULL_IMAGE_NAME)${NC}"
	docker pull $(FULL_IMAGE_NAME)

clean: ## Clean up Docker resources
	@echo "${RED}Cleaning up Docker resources${NC}"
	docker system prune -f
	docker volume prune -f

compose-up: ## Start services with docker-compose
	docker-compose up -d

compose-down: ## Stop services with docker-compose
	docker-compose down

compose-logs: ## Show docker-compose logs
	docker-compose logs -f

compose-ps: ## Show docker-compose status
	docker-compose ps

# Multi-platform builds
build-multi: ## Build multi-platform image
	@echo "${GREEN}Building multi-platform image${NC}"
	docker buildx build \
		--platform linux/amd64,linux/arm64 \
		-t $(FULL_IMAGE_NAME) \
		--push \
		.

# Security scanning
scan: ## Scan image for vulnerabilities
	@echo "${GREEN}Scanning image for vulnerabilities${NC}"
	docker run --rm \
		-v /var/run/docker.sock:/var/run/docker.sock \
		aquasec/trivy image $(FULL_IMAGE_NAME)

# Image size analysis
size: ## Analyze image size
	@echo "${GREEN}Analyzing image size${NC}"
	docker images $(FULL_IMAGE_NAME)
	docker history $(FULL_IMAGE_NAME)
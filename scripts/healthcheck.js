#!/usr/bin/env node

/**
 * Health check script for Docker container
 * Exit codes:
 * 0 - healthy
 * 1 - unhealthy
 */

const http = require('http');
const { URL } = require('url');

// Configuration
const HEALTH_CHECK_URL = process.env.HEALTH_CHECK_URL || 'http://localhost:3000/health';
const TIMEOUT = parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000;
const EXPECTED_STATUS = parseInt(process.env.EXPECTED_STATUS) || 200;

// Parse URL
const healthUrl = new URL(HEALTH_CHECK_URL);

// Health check function
function performHealthCheck() {
    const options = {
        hostname: healthUrl.hostname,
        port: healthUrl.port || (healthUrl.protocol === 'https:' ? 443 : 80),
        path: healthUrl.pathname + healthUrl.search,
        method: 'GET',
        timeout: TIMEOUT,
        headers: {
            'User-Agent': 'Docker-HealthCheck/1.0'
        }
    };

    const req = http.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
            body += chunk;
        });

        res.on('end', () => {
            // Check status code
            if (res.statusCode !== EXPECTED_STATUS) {
                console.error(`Health check failed: Expected status ${EXPECTED_STATUS}, got ${res.statusCode}`);
                process.exit(1);
            }

            // Try to parse JSON response for detailed checks
            try {
                const data = JSON.parse(body);

                // Check specific health indicators
                const checks = [];

                // Database check
                if (data.database !== undefined) {
                    checks.push({
                        name: 'Database',
                        healthy: data.database === 'healthy' || data.database === true,
                        status: data.database
                    });
                }

                // Redis check
                if (data.redis !== undefined) {
                    checks.push({
                        name: 'Redis',
                        healthy: data.redis === 'healthy' || data.redis === true,
                        status: data.redis
                    });
                }

                // Memory check
                if (data.memory !== undefined) {
                    const memoryUsage = process.memoryUsage();
                    const memoryThreshold = 0.9; // 90% threshold
                    const usageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;

                    checks.push({
                        name: 'Memory',
                        healthy: usageRatio < memoryThreshold,
                        status: `${Math.round(usageRatio * 100)}%`
                    });
                }

                // Overall health
                const allHealthy = checks.every(check => check.healthy);

                if (!allHealthy) {
                    console.error('Health check failed:');
                    checks.forEach(check => {
                        if (!check.healthy) {
                            console.error(`  - ${check.name}: ${check.status}`);
                        }
                    });
                    process.exit(1);
                }

                // Success
                console.log('Health check passed');
                if (checks.length > 0) {
                    console.log('Service status:');
                    checks.forEach(check => {
                        console.log(`  - ${check.name}: ${check.status}`);
                    });
                }
                process.exit(0);

            } catch (e) {
                // If response is not JSON, just check status code
                if (body.toLowerCase().includes('healthy') || body.toLowerCase().includes('ok')) {
                    console.log('Health check passed');
                    process.exit(0);
                } else {
                    console.error('Health check failed: Invalid response');
                    process.exit(1);
                }
            }
        });
    });

    req.on('error', (err) => {
        console.error(`Health check failed: ${err.message}`);
        process.exit(1);
    });

    req.on('timeout', () => {
        console.error(`Health check failed: Timeout after ${TIMEOUT}ms`);
        req.destroy();
        process.exit(1);
    });

    req.end();
}

// Additional system checks
function checkFileSystem() {
    const fs = require('fs');

    try {
        // Check if temporary health file exists
        if (fs.existsSync('/tmp/healthy')) {
            return true;
        }

        // Try to write a test file
        const testFile = '/tmp/healthcheck-test';
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        return true;
    } catch (e) {
        console.error('Filesystem check failed:', e.message);
        return false;
    }
}

// Perform checks
if (!checkFileSystem()) {
    process.exit(1);
}

performHealthCheck();
const request = require('supertest');
const { expect } = require('chai');
const app = require('../../src/app');
const db = require('../../src/db');
const redis = require('../../src/redis');

describe('API Integration Tests', () => {
    let server;
    let authToken;

    before(async () => {
        // Start server
        server = app.listen(0); // Random port

        // Run migrations
        await db.migrate.latest();

        // Seed test data
        await db.seed.run();

        // Clear Redis
        await redis.flushall();
    });

    after(async () => {
        // Clean up
        await db.migrate.rollback();
        await redis.quit();
        await db.destroy();
        server.close();
    });

    beforeEach(async () => {
        // Clear specific tables before each test
        await db('users').del();
        await db('sessions').del();

        // Create test user and get auth token
        const response = await request(server)
            .post('/api/auth/register')
            .send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'testPassword123'
            });

        authToken = response.body.token;
    });

    describe('Authentication Endpoints', () => {
        describe('POST /api/auth/register', () => {
            it('should register a new user', async () => {
                const response = await request(server)
                    .post('/api/auth/register')
                    .send({
                        name: 'New User',
                        email: 'newuser@example.com',
                        password: 'password123'
                    })
                    .expect(201);

                expect(response.body).to.have.property('token');
                expect(response.body).to.have.property('user');
                expect(response.body.user).to.have.property('id');
                expect(response.body.user.email).to.equal('newuser@example.com');
                expect(response.body.user).to.not.have.property('password');
            });

            it('should not register user with existing email', async () => {
                const response = await request(server)
                    .post('/api/auth/register')
                    .send({
                        name: 'Duplicate User',
                        email: 'test@example.com',
                        password: 'password123'
                    })
                    .expect(409);

                expect(response.body).to.have.property('error');
                expect(response.body.error).to.include('already exists');
            });

            it('should validate required fields', async () => {
                const response = await request(server)
                    .post('/api/auth/register')
                    .send({
                        name: 'Missing Email'
                    })
                    .expect(400);

                expect(response.body).to.have.property('errors');
                expect(response.body.errors).to.be.an('array');
            });
        });

        describe('POST /api/auth/login', () => {
            it('should login with valid credentials', async () => {
                const response = await request(server)
                    .post('/api/auth/login')
                    .send({
                        email: 'test@example.com',
                        password: 'testPassword123'
                    })
                    .expect(200);

                expect(response.body).to.have.property('token');
                expect(response.body).to.have.property('user');
                expect(response.body.user.email).to.equal('test@example.com');
            });

            it('should not login with invalid password', async () => {
                const response = await request(server)
                    .post('/api/auth/login')
                    .send({
                        email: 'test@example.com',
                        password: 'wrongPassword'
                    })
                    .expect(401);

                expect(response.body).to.have.property('error');
                expect(response.body.error).to.include('Invalid credentials');
            });
        });
    });

    describe('User Endpoints', () => {
        describe('GET /api/users/profile', () => {
            it('should get current user profile', async () => {
                const response = await request(server)
                    .get('/api/users/profile')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body).to.have.property('id');
                expect(response.body).to.have.property('email');
                expect(response.body.email).to.equal('test@example.com');
            });

            it('should require authentication', async () => {
                await request(server)
                    .get('/api/users/profile')
                    .expect(401);
            });
        });

        describe('PUT /api/users/profile', () => {
            it('should update user profile', async () => {
                const response = await request(server)
                    .put('/api/users/profile')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        name: 'Updated Name',
                        bio: 'New bio'
                    })
                    .expect(200);

                expect(response.body.name).to.equal('Updated Name');
                expect(response.body.bio).to.equal('New bio');
            });

            it('should not allow email update', async () => {
                const response = await request(server)
                    .put('/api/users/profile')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        email: 'newemail@example.com'
                    })
                    .expect(400);

                expect(response.body).to.have.property('error');
            });
        });
    });

    describe('Health Check', () => {
        it('should return healthy status', async () => {
            const response = await request(server)
                .get('/health')
                .expect(200);

            expect(response.body).to.have.property('status', 'healthy');
            expect(response.body).to.have.property('database');
            expect(response.body).to.have.property('redis');
            expect(response.body).to.have.property('uptime');
        });
    });

    describe('Rate Limiting', () => {
        it('should enforce rate limits', async function() {
            this.timeout(5000);

            // Make multiple requests quickly
            const requests = Array(11).fill().map(() =>
                request(server)
                    .get('/api/users/profile')
                    .set('Authorization', `Bearer ${authToken}`)
            );

            const responses = await Promise.all(requests);

            // Last request should be rate limited
            const rateLimited = responses.some(res => res.status === 429);
            expect(rateLimited).to.be.true;
        });
    });

    describe('Error Handling', () => {
        it('should handle 404 errors', async () => {
            const response = await request(server)
                .get('/api/non-existent-endpoint')
                .expect(404);

            expect(response.body).to.have.property('error');
            expect(response.body.error).to.include('Not found');
        });

        it('should handle validation errors', async () => {
            const response = await request(server)
                .post('/api/users')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    // Invalid data
                    email: 'not-an-email'
                })
                .expect(400);

            expect(response.body).to.have.property('errors');
            expect(response.body.errors).to.be.an('array');
        });
    });
});
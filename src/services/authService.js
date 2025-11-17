const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');

/**
 * Authentication Service
 * Handles JWT token generation and verification
 */
class AuthService {
    /**
     * Generate JWT token for user
     */
    generateToken(payload, expiresIn = null) {
        const options = {
            issuer: config.app.name,
            audience: config.app.url,
        };

        if (expiresIn) {
            options.expiresIn = expiresIn;
        } else {
            options.expiresIn = config.security.jwtExpire;
        }

        return jwt.sign(payload, config.security.jwtSecret, options);
    }

    /**
     * Verify JWT token
     */
    verifyToken(token) {
        try {
            return jwt.verify(token, config.security.jwtSecret, {
                issuer: config.app.name,
                audience: config.app.url,
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Decode token without verification (for inspection)
     */
    decodeToken(token) {
        return jwt.decode(token);
    }

    /**
     * Hash password using bcrypt
     */
    async hashPassword(password) {
        const salt = await bcrypt.genSalt(config.security.bcryptRounds);
        return await bcrypt.hash(password, salt);
    }

    /**
     * Compare password with hash
     */
    async comparePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Generate token payload from user object
     */
    createTokenPayload(user) {
        return {
            id: user.id,
            userId: user.id,
            sub: user.id,
            email: user.email,
            role: user.role,
            roles: user.roles || (user.role ? [user.role] : []),
            name: user.name,
            iat: Math.floor(Date.now() / 1000),
        };
    }

    /**
     * Extract token from request
     */
    extractToken(req) {
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return null;
        }

        return authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;
    }
}

module.exports = new AuthService();


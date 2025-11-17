const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Authentication Middleware
 * Verifies JWT token from Authorization header
 */
const authenticate = (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No authorization token provided'
            });
        }

        // Extract token from "Bearer <token>" format
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader;

        if (!token) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid authorization header format'
            });
        }

        // Verify token
        try {
            const decoded = jwt.verify(token, config.security.jwtSecret);
            
            // Attach user info to request
            req.user = decoded;
            req.userId = decoded.id || decoded.userId || decoded.sub;
            
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Token has expired'
                });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Invalid token'
                });
            }
            throw error;
        }
    } catch (error) {
        return res.status(500).json({
            error: 'Authentication error',
            message: error.message
        });
    }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader) {
            const token = authHeader.startsWith('Bearer ')
                ? authHeader.slice(7)
                : authHeader;

            if (token) {
                try {
                    const decoded = jwt.verify(token, config.security.jwtSecret);
                    req.user = decoded;
                    req.userId = decoded.id || decoded.userId || decoded.sub;
                } catch (error) {
                    // Ignore invalid tokens in optional auth
                }
            }
        }
        
        next();
    } catch (error) {
        // Continue without auth if there's an error
        next();
    }
};

/**
 * Role-based authorization middleware
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role || req.user.roles?.[0];
        
        if (!roles.includes(userRole)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

module.exports = {
    authenticate,
    optionalAuth,
    authorize
};


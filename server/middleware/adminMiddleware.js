const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'talke_secret_key_123';

const verifySuperAdmin = (req, res, next) => {
    // 1. Verify Token (using existing logic or reusing authMiddleware)
    // We'll reimplement briefly to grab the token, but ideally we chain middlewares: verifyToken -> verifySuperAdmin
    // But since I don't want to break the previous flow, let's assume this middleware is placed AFTER verifyToken
    // OR we just do the check here if it's not present.

    // Better approach: This middleware assumes 'req.userRole' is already set by 'verifyToken'.
    // So we will use it like: router.use(verifyToken, verifySuperAdmin);

    if (req.userRole !== 'superadmin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas Super Admins.' });
    }

    next();
};

module.exports = verifySuperAdmin;

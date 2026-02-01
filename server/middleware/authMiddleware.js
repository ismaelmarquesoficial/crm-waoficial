const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-secret-key-change-this'; // Must match valid token generation secret

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Retrieves 'Bearer TOKEN'

  if (!token) {
    return res.status(403).json({ error: 'Nenhum token fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // THE MAGIC HAPPENS HERE:
    // We inject tenantId into the 'req' object so all following
    // controllers can use it effortlessly.
    console.log('Token Payload:', decoded); // DEBUG
    req.tenantId = decoded.tenantId;
    req.userId = decoded.userId;
    req.userRole = decoded.role; // Also useful to have role available

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
};

module.exports = verifyToken;

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const crmRoutes = require('./routes/crm');
const adminRoutes = require('./routes/admin');
const channelRoutes = require('./routes/channels');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-secret-key-change-this'; // In production, move to .env

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/crm', crmRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/channels', channelRoutes);

// Login Route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // 1. Find user by email
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // 2. Compare password
        // Note: If you have plain text passwords in your DB currently (common in early dev), 
        // you might need to check directly: if (password !== user.password_hash) ...
        // But assuming standard practice of hashing:
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            // Fallback for plain text testing if hash check fails (OPTIONAL, remove in production)
            if (password === user.password_hash) {
                // allow pass
            } else {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }

        // 3. Generate Token
        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role, tenantId: user.tenant_id },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 4. Return success
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantId: user.tenant_id
                // avatar: user.avatar // Add if/when column exists
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Middleware to verify Token (Use this for protected routes later)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Simple Protected Route Example
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.userId]);
        if (result.rows.length === 0) return res.sendStatus(404);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

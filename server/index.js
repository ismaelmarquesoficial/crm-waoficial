const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const http = require('http'); // Import HTTP
const { Server } = require("socket.io"); // Import Socket.io
const db = require('./db');

const crmRoutes = require('./routes/crm');
const adminRoutes = require('./routes/admin');
const channelRoutes = require('./routes/channels');
const campaignRoutes = require('./routes/campaigns'); // Nova Rota

// Import Worker
const { startWorker } = require('./workers/campaignDispatcher');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-secret-key-change-this'; // In production, move to .env

// Configurar Servidor HTTP e Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Em produção, restrinja para o domínio do frontend
        methods: ["GET", "POST"]
    }
});

// Disponibilizar io globalmente via req.app.get('io')
app.set('io', io);

app.use(cors());
app.use(express.json());

// Injetar IO no Request (opcional, se rotas precisarem emitir eventos)
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Servir arquivos estáticos (Áudios, Imagens, etc.)
// A URL será: http://localhost:3001/files/tenant_X/channel_Y/arquivo.mp3
const path = require('path');
app.use('/files', express.static(path.join(__dirname, 'storage')));

// Routes
app.use('/api/crm', crmRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/campaigns', campaignRoutes); // Registrada

const chatRoutes = require('./routes/chat');
app.use('/api/chat', chatRoutes);

const settingsRoutes = require('./routes/settings');
app.use('/api/settings', settingsRoutes);

// Webhooks
const whatsappWebhookRoutes = require('./webhooks/whatsapp/routes');
app.use('/api/webhooks/whatsapp', whatsappWebhookRoutes);

// --- NOVA ARQUITETURA (V2) ---
const apiV2Routes = require('./routes/index');
app.use('/api/v2', apiV2Routes);

// Login Route
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ userId: user.id, role: user.role, tenantId: user.tenant_id }, JWT_SECRET, { expiresIn: '8h' });

        res.json({ token, user: { id: user.id, name: user.name, role: user.role, tenant_id: user.tenant_id } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login error' });
    }
});

// Socket.io Connection Logic
io.on("connection", (socket) => {
    // console.log("Cliente conectado:", socket.id);

    // Room por Tenant (segurança: frontend deve emitir 'join_tenant' após login)
    socket.on("join_tenant", (tenantId) => {
        socket.join(`tenant_${tenantId}`);
        // console.log(`Socket ${socket.id} entrou na sala tenant_${tenantId}`);
    });
});

// === INICIAR WORKER ===
startWorker(io); // Passando IO para o worker comunicar progresso

// Start Server (Nota: usamos server.listen em vez de app.listen)
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Socket.io ready on port ${PORT}`);
});

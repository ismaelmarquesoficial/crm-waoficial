const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'temp/' });
const Client = require('../services/whatsapp-oficial/Client');
const fs = require('fs');
const path = require('path');
const metadataFetcher = require('../utils/metadataFetcher');
const verifyToken = require('../middleware/authMiddleware');

/**
 * GET /api/utils/metadata?url=...
 * Busca metadados de uma URL para prévia de links
 */
router.get('/metadata', verifyToken, async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    const metadata = await metadataFetcher.fetch(url);

    if (!metadata) {
        return res.status(404).json({ error: 'Não foi possível obter metadados para esta URL' });
    }

    res.json(metadata);
});

/**
 * POST /api/utils/upload-media
 * Faz upload de um arquivo para os servidores da Meta e retorna o media_id.
 * Também salva uma cópia local para prévia no frontend.
 */
router.post('/upload-media', verifyToken, upload.single('file'), async (req, res) => {
    const { channelId } = req.body;
    const file = req.file;
    const tenantId = req.tenantId;

    if (!file || !channelId) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Arquivo e channelId são obrigatórios.' });
    }

    try {
        const db = require('../db');
        // Buscar Token do Canal
        const channelRes = await db.query(
            "SELECT phone_number_id, permanent_token FROM whatsapp_accounts WHERE id = $1 AND tenant_id = $2",
            [channelId, tenantId]
        );

        if (channelRes.rowCount === 0) throw new Error('Canal não encontrado ou acesso negado.');
        const { phone_number_id, permanent_token } = channelRes.rows[0];

        // Mover para pasta pública para que o frontend possa exibir a prévia
        const storageDir = path.join(__dirname, '..', 'public', 'uploads', String(tenantId), 'temp_interactive');
        if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

        const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
        const finalPath = path.join(storageDir, fileName);

        fs.renameSync(file.path, finalPath);

        // Upload para Meta
        const mediaId = await Client.uploadMedia(
            phone_number_id,
            permanent_token,
            finalPath,
            file.mimetype || 'image/jpeg'
        );

        const publicUrl = `/uploads/${tenantId}/temp_interactive/${fileName}`;

        res.json({ id: mediaId, url: publicUrl });
    } catch (err) {
        console.error('[Utils Upload] ❌', err.message);
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

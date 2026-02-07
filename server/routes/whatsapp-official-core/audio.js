const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'temp/' });
const db = require('../../db');
const AudioSender = require('../../services/whatsapp-oficial/Audio/AudioSender');
const verifyToken = require('../../middleware/authMiddleware');
const fs = require('fs');

/**
 * CORE WHATSAPP OFICIAL - Rotas de Áudio
 */

router.use(verifyToken);

router.post('/send/:contactId', upload.single('file'), async (req, res) => {
    const { contactId } = req.params;
    const { channelId } = req.body;
    const file = req.file;
    const tenantId = req.tenantId;

    if (!file || !channelId) {
        return res.status(400).json({ error: 'Arquivo e channelId são obrigatórios.' });
    }

    try {
        const channelRes = await db.query(
            "SELECT id, phone_number_id, permanent_token FROM whatsapp_accounts WHERE id = $1 AND tenant_id = $2",
            [channelId, tenantId]
        );

        if (channelRes.rowCount === 0) return res.status(404).json({ error: 'Canal não encontrado.' });
        const channel = channelRes.rows[0];

        const contactRes = await db.query("SELECT phone FROM contacts WHERE id = $1 AND tenant_id = $2", [req.body.contactId || contactId, tenantId]);
        if (contactRes.rowCount === 0) return res.status(404).json({ error: 'Contato não encontrado.' });
        const contactPhone = contactRes.rows[0].phone;

        const result = await AudioSender.send(tenantId, contactPhone, channel, file, file.path);

        const insert = await db.query(
            `INSERT INTO chat_logs 
            (tenant_id, contact_id, whatsapp_account_id, wamid, message, type, direction, status, channel, 
             media_type, file_path_ogg, file_path_mp3, file_hash, meta_media_id, timestamp, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, 'OUTBOUND', 'sent', 'WhatsApp Business', 
                    $7, $8, $9, $10, $11, NOW(), NOW())
            RETURNING *`,
            [
                tenantId, req.body.contactId || contactId, channel.id, result.wamid, '[ÁUDIO]',
                'audio', 'audio', result.file_path_ogg, result.file_path_mp3, result.fileHash, result.mediaId
            ]
        );

        const io = req.app.get('io');
        if (io) io.to(`tenant_${tenantId}`).emit('new_message', insert.rows[0]);

        res.json(insert.rows[0]);
    } catch (err) {
        console.error('[OFFICIAL-CORE-AUDIO]', err.message);
        res.status(500).json({ error: 'Erro no Core Oficial.' });
    } finally {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
});

module.exports = router;

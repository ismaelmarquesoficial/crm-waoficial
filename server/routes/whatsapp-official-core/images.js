const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'temp/' });
const db = require('../../db');
const ImageSender = require('../../services/whatsapp-oficial/Image/ImageSender');
const verifyToken = require('../../middleware/authMiddleware');
const fs = require('fs');

/**
 * CORE WHATSAPP OFICIAL - Rotas de Imagem
 */

router.use(verifyToken);

router.post('/send/:contactId', upload.single('file'), async (req, res) => {
    const { contactId } = req.params;
    const { channelId, caption } = req.body;
    const file = req.file;
    const tenantId = req.tenantId;

    if (!file || !channelId) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Imagem e channelId são obrigatórios.' });
    }

    try {
        // 1. Validar Canal
        const channelRes = await db.query(
            "SELECT id, phone_number_id, permanent_token FROM whatsapp_accounts WHERE id = $1 AND tenant_id = $2",
            [channelId, tenantId]
        );
        if (channelRes.rowCount === 0) throw new Error('Canal não encontrado.');
        const channel = channelRes.rows[0];

        // 2. Validar Contato
        const contactRes = await db.query("SELECT phone FROM contacts WHERE id = $1 AND tenant_id = $2", [contactId, tenantId]);
        if (contactRes.rowCount === 0) throw new Error('Contato não encontrado.');
        const contactPhone = contactRes.rows[0].phone;

        // 3. Processar Envio Inteligente
        const result = await ImageSender.send(tenantId, contactPhone, channel, file, caption);

        // 4. Salvar Log
        const insert = await db.query(
            `INSERT INTO chat_logs 
            (tenant_id, contact_id, whatsapp_account_id, wamid, message, type, direction, status, channel, 
             media_type, media_url, file_hash, meta_media_id, timestamp, created_at) 
            VALUES ($1, $2, $3, $4, $5, 'image', 'OUTBOUND', 'sent', 'WhatsApp Business', 
                    'image', $6, $7, $8, NOW(), NOW())
            RETURNING *`,
            [
                tenantId, contactId, channel.id, result.wamid, caption || '[IMAGEM]',
                result.publicUrl, result.fileHash, result.mediaId
            ]
        );

        // 5. Socket Notify
        const io = req.app.get('io');
        if (io) io.to(`tenant_${tenantId}`).emit('new_message', insert.rows[0]);

        res.json(insert.rows[0]);
    } catch (err) {
        console.error('[OFFICIAL-CORE-IMAGE] ❌', err.message);
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        res.status(500).json({ error: err.message || 'Erro ao enviar imagem.' });
    }
});

module.exports = router;

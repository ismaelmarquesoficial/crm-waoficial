const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'temp/' });
const db = require('../db');
const AudioSender = require('../services/whatsapp-oficial/Audio/AudioSender');
const path = require('path');
const fs = require('fs');

/**
 * Rotas dedicadas ao envio de mensagens via Core WhatsApp Oficial (V2)
 */

// Envio de Mídias (Áudio)
router.post('/:contactId/send-media', upload.single('file'), async (req, res) => {
    const { contactId } = req.params;
    const { type, channelId } = req.body;
    const file = req.file;
    const tenantId = req.tenantId || 8; // Fallback para dev

    if (!file) return res.status(400).json({ error: 'Arquivo não enviado.' });

    try {
        // Busca credenciais do canal
        const channelRes = await db.query(
            "SELECT id, phone_number_id, permanent_token FROM whatsapp_accounts WHERE id = $1",
            [channelId]
        );
        const channel = channelRes.rows[0];

        // Busca telefone do contato
        const contactRes = await db.query("SELECT phone FROM contacts WHERE id = $1", [contactId]);
        const contactPhone = contactRes.rows[0].phone;

        let result = {};

        // Delegação para o Core Oficial
        if (type === 'audio' || file.mimetype.startsWith('audio/')) {
            result = await AudioSender.send(tenantId, contactPhone, channel, file, file.path);
        }

        // Registrar no log do banco
        const insert = await db.query(
            `INSERT INTO chat_logs 
            (tenant_id, contact_id, whatsapp_account_id, wamid, message, type, direction, status, channel, 
             media_type, file_path_ogg, file_path_mp3, timestamp, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, 'OUTBOUND', 'sent', 'WhatsApp Business', 
                    $7, $8, $9, NOW(), NOW())
            RETURNING *`,
            [
                tenantId, contactId, channel.id, result.wamid, '[ÁUDIO]',
                'audio', 'audio', result.file_path_ogg, result.file_path_mp3
            ]
        );

        const io = req.app.get('io');
        if (io) io.to(`tenant_${tenantId}`).emit('new_message', insert.rows[0]);

        res.json(insert.rows[0]);

    } catch (err) {
        console.error('Erro ao processar envio de mídia no Core:', err);
        res.status(500).json({ error: 'Falha ao enviar arquivo.' });
    } finally {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
});

module.exports = router;

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
    const tenantId = req.tenantId || 8; // Fallback para desenvolvimento

    console.log(`[Route V2] 📥 Requisição recebida - Tipo: ${type}, Contato: ${contactId}, Canal: ${channelId}`);

    if (!file) {
        console.error('[Route V2] ❌ Erro: Nenhum arquivo foi enviado.');
        return res.status(400).json({ error: 'Arquivo não enviado.' });
    }

    try {
        // 1. Buscar credenciais do canal
        console.log(`[Route V2] Buscando credenciais para o canal ${channelId}...`);
        const channelRes = await db.query(
            "SELECT id, phone_number_id, permanent_token FROM whatsapp_accounts WHERE id = $1",
            [channelId]
        );

        if (channelRes.rowCount === 0) {
            console.error(`[Route V2] ❌ Erro: Canal ${channelId} não encontrado.`);
            return res.status(404).json({ error: 'Canal não encontrado.' });
        }
        const channel = channelRes.rows[0];

        // 2. Buscar telefone do contato
        const contactRes = await db.query("SELECT phone FROM contacts WHERE id = $1", [contactId]);
        if (contactRes.rowCount === 0) {
            console.error(`[Route V2] ❌ Erro: Contato ${contactId} não encontrado.`);
            return res.status(404).json({ error: 'Contato não encontrado.' });
        }
        const contactPhone = contactRes.rows[0].phone;

        let result = {};

        // 3. Processar áudio via Core Oficial
        if (type === 'audio' || file.mimetype.startsWith('audio/')) {
            console.log('[Route V2] 🎙️ Encaminhando para AudioSender.send...');
            result = await AudioSender.send(tenantId, contactPhone, channel, file, file.path);
        }

        // 4. Registrar no log do banco
        console.log('[Route V2] 💾 Registrando mensagem no banco de dados...');
        const insert = await db.query(
            `INSERT INTO chat_logs 
            (tenant_id, contact_id, whatsapp_account_id, wamid, message, type, direction, status, channel, 
             media_type, file_path_ogg, file_path_mp3, file_hash, timestamp, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, 'OUTBOUND', 'sent', 'WhatsApp Business', 
                    $7, $8, $9, $10, NOW(), NOW())
            RETURNING *`,
            [
                tenantId, contactId, channel.id, result.wamid, '[ÁUDIO]',
                'audio', 'audio', result.file_path_ogg, result.file_path_mp3, result.fileHash
            ]
        );

        // 5. Notificar via Socket
        const io = req.app.get('io');
        if (io) {
            console.log(`[Route V2] 📡 Emitindo evento socket para tenant_${tenantId}`);
            io.to(`tenant_${tenantId}`).emit('new_message', insert.rows[0]);
        }

        console.log('[Route V2] ✅ Processo concluído com sucesso.');
        res.json(insert.rows[0]);

    } catch (err) {
        console.error('[Route V2] ❌ Erro crítico:', err.message);
        res.status(500).json({ error: 'Falha ao processar e enviar mensagem.' });
    } finally {
        // Limpar arquivo temporário
        if (file && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
            console.log(`[Route V2] Limpeza: Arquivo temporário ${file.path} removido.`);
        }
    }
});

module.exports = router;

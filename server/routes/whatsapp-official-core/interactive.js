const express = require('express');
const router = express.Router();
const db = require('../../db');
const InteractiveSender = require('../../services/whatsapp-oficial/Interactive/InteractiveSender');
const verifyToken = require('../../middleware/authMiddleware');

/**
 * ROTA: Enviar Mensagem Interativa (Botões/Listas)
 */
router.post('/send/:contactId', verifyToken, async (req, res) => {
    const { contactId } = req.params;
    const { interactive, channelId } = req.body;
    const tenantId = req.tenantId;

    if (!interactive) {
        return res.status(400).json({ error: 'Dados interativos são obrigatórios.' });
    }

    try {
        // 1. Buscar Canal Conectado
        let channelQuery = "SELECT * FROM whatsapp_accounts WHERE tenant_id = $1 AND status = 'CONNECTED'";
        let channelParams = [tenantId];

        if (channelId) {
            channelQuery += " AND id = $2";
            channelParams.push(channelId);
        } else {
            channelQuery += " LIMIT 1";
        }

        const channelRes = await db.query(channelQuery, channelParams);
        if (channelRes.rows.length === 0) {
            return res.status(400).json({ error: 'Nenhum canal WhatsApp conectado encontrado.' });
        }
        const channel = channelRes.rows[0];

        // 2. Buscar Dados do Contato
        const contactRes = await db.query("SELECT phone FROM contacts WHERE id = $1 AND tenant_id = $2", [contactId, tenantId]);
        if (contactRes.rows.length === 0) {
            return res.status(404).json({ error: 'Contato não encontrado.' });
        }
        const contact = contactRes.rows[0];

        // 3. Enviar via Sender Especializado
        const { wamid, savedObject } = await InteractiveSender.send(
            tenantId,
            contact.phone,
            channel,
            interactive
        );

        // 4. Salvar no Banco (Usando o novo formato JSON no campo message)
        const insert = await db.query(
            `INSERT INTO chat_logs 
            (tenant_id, contact_id, whatsapp_account_id, wamid, message, type, direction, status, channel, timestamp, created_at) 
            VALUES ($1, $2, $3, $4, $5, 'interactive', 'OUTBOUND', 'sent', 'WhatsApp Business', NOW(), NOW())
            RETURNING *`,
            [tenantId, contactId, channel.id, wamid, JSON.stringify(savedObject)]
        );

        // 5. Emitir via Socket para atualização em tempo real
        const io = req.app.get('io');
        if (io) {
            io.to(`tenant_${tenantId}`).emit('new_message', insert.rows[0]);
        }

        res.json(insert.rows[0]);

    } catch (err) {
        const errorMsg = err.response?.data?.error?.message || err.message;
        console.error('Erro ao enviar mensagem interativa:', err.response?.data || err.message);
        res.status(500).json({ error: `Erro na Meta: ${errorMsg}` });
    }
});

module.exports = router;

const express = require('express');
const axios = require('axios');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

// 1. Listar Conversas (Sidebar) - COM FILTRO
// Retorna contatos do Tenant, ordenados por última interação
router.get('/', async (req, res) => {
    try {
        const tenantId = req.tenantId || (req.user && req.user.tenantId);
        const userId = req.userId || (req.user && req.user.id);
        const { channelId } = req.query; // Filtro de conta

        console.log(`🔎 API Chat: Buscando chats para Tenant ID: ${tenantId} (User ID: ${userId}) | Canal: ${channelId || 'Todos'}`);

        let whereClause = "WHERE c.tenant_id = $1";
        const queryParams = [tenantId];

        if (channelId && channelId !== 'all') {
            whereClause += " AND EXISTS (SELECT 1 FROM chat_logs cl WHERE cl.contact_id = c.id AND cl.whatsapp_account_id = $2)";
            queryParams.push(channelId);
        }

        const query = `
            SELECT 
                c.id, 
                c.name, 
                c.phone, 
                c.last_interaction,
                (SELECT message FROM chat_logs WHERE contact_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message,
                (SELECT type FROM chat_logs WHERE contact_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message_type,
                (SELECT timestamp FROM chat_logs WHERE contact_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message_time,
                (SELECT count(*) FROM chat_logs WHERE contact_id = c.id AND direction = 'INBOUND' AND status = 'unread') as unread_count
            FROM contacts c
            ${whereClause}
            ORDER BY c.last_interaction DESC NULLS LAST
            LIMIT 50
        `;

        const result = await db.query(query, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao listar chats:', err);
        res.status(500).json({ error: 'Erro ao listar conversas' });
    }
});

// 2. Histórico de Mensagens de um Contato - COM FILTRO DE CANAL
router.get('/:contactId/messages', async (req, res) => {
    const { contactId } = req.params;
    const { channelId } = req.query; // Receber filtro da conta
    const limit = 100;

    try {
        const tenantId = req.tenantId || (req.user && req.user.tenantId);

        // Verifica consistência de tenant
        const contactCheck = await db.query("SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2", [contactId, tenantId]);
        if (contactCheck.rows.length === 0) return res.status(404).json({ error: 'Contato não encontrado' });

        let query = "SELECT * FROM chat_logs WHERE contact_id = $1";
        const params = [contactId];

        if (channelId && channelId !== 'all') {
            query += " AND whatsapp_account_id = $2";
            params.push(channelId);
            params.push(limit); // limit passa a ser $3
            query += " ORDER BY timestamp ASC LIMIT $3";
        } else {
            params.push(limit); // limit é $2
            query += " ORDER BY timestamp ASC LIMIT $2";
        }

        const result = await db.query(query, params);

        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar mensagens:', err);
        res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
});

// 3. Enviar Mensagem (Texto) - COM STICKY CHANNEL
router.post('/:contactId/send', async (req, res) => {
    const { contactId } = req.params;
    const { type, content } = req.body;

    if (!content) return res.status(400).json({ error: 'Conteúdo vazio.' });

    try {
        const tenantId = req.tenantId || (req.user && req.user.tenantId);

        // --- STICKY CHANNEL LOGIC ---
        let channelIdToUse = null;

        const lastMsgRes = await db.query(
            "SELECT whatsapp_account_id FROM chat_logs WHERE contact_id = $1 ORDER BY timestamp DESC LIMIT 1",
            [contactId]
        );

        if (lastMsgRes.rows.length > 0) {
            channelIdToUse = lastMsgRes.rows[0].whatsapp_account_id;
            console.log(`info: Mantendo conversa pelo canal ID: ${channelIdToUse}`);
        }

        // Buscar Canal
        let channelQuery = "SELECT id, phone_number_id, permanent_token FROM whatsapp_accounts WHERE tenant_id = $1 AND status = 'CONNECTED'";
        let channelParams = [tenantId];

        if (channelIdToUse) {
            channelQuery += " AND id = $2";
            channelParams.push(channelIdToUse);
        } else {
            channelQuery += " LIMIT 1";
        }

        let channelRes = await db.query(channelQuery, channelParams);

        if (channelRes.rows.length === 0) {
            if (channelIdToUse) {
                console.warn(`aviso: Canal anterior ${channelIdToUse} não disponível. Tentando qualquer canal conectado...`);
                const fallbackRes = await db.query("SELECT id, phone_number_id, permanent_token FROM whatsapp_accounts WHERE tenant_id = $1 AND status = 'CONNECTED' LIMIT 1", [tenantId]);
                if (fallbackRes.rows.length === 0) return res.status(400).json({ error: 'Nenhum canal WhatsApp conectado.' });
                channelRes = fallbackRes;
            } else {
                return res.status(400).json({ error: 'Nenhum canal WhatsApp conectado.' });
            }
        }

        const channel = channelRes.rows[0];

        // Buscar Telefone
        const contactRes = await db.query("SELECT phone FROM contacts WHERE id = $1", [contactId]);
        if (contactRes.rows.length === 0) return res.status(404).json({ error: 'Contato não encontrado.' });

        const contactPhone = contactRes.rows[0].phone;

        // Enviar para Meta API
        const url = `https://graph.facebook.com/v19.0/${channel.phone_number_id}/messages`;
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: contactPhone,
            type: "text",
            text: { body: content }
        };

        const metaRes = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${channel.permanent_token}`,
                'Content-Type': 'application/json'
            }
        });

        const wamid = metaRes.data.messages[0].id;

        // Salvar no Banco (OUTBOUND em UTC)
        const timestamp = new Date();
        console.log(`📤 [DEBUG] Criando mensagem OUTBOUND. Timestamp UTC Node: ${timestamp.toISOString()} | Local Server: ${timestamp.toString()}`);

        const insert = await db.query(
            `INSERT INTO chat_logs 
            (tenant_id, contact_id, whatsapp_account_id, wamid, message, type, direction, status, timestamp, created_at) 
            VALUES ($1, $2, $3, $4, $5, 'text', 'OUTBOUND', 'sent', $6, $6)
            RETURNING *`,
            [tenantId, contactId, channel.id, wamid, content, timestamp]
        );

        // Emitir Socket
        const io = req.app.get('io');
        if (io) {
            io.to(`tenant_${tenantId}`).emit('new_message', insert.rows[0]);
        }

        res.json(insert.rows[0]);

    } catch (err) {
        console.error('Erro ao enviar mensagem:', err.response?.data || err.message);
        res.status(500).json({ error: 'Erro ao enviar mensagem via WhatsApp.' });
    }
});

module.exports = router;

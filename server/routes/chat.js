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
                c.tags,
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

// 2. Histórico de Mensagens de um Contato - COM FILTRO DE CANAL E PAGINAÇÃO
router.get('/:contactId/messages', async (req, res) => {
    const { contactId } = req.params;
    const { channelId, offset } = req.query; // Receber filtro da conta e offset para paginação
    const limit = 100; // Carregar 100 mensagens por vez
    const offsetNum = parseInt(offset) || 0;

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
            params.push(limit);
            params.push(offsetNum);
            query += " ORDER BY timestamp DESC LIMIT $3 OFFSET $4"; // DESC to get most recent
        } else {
            params.push(limit);
            params.push(offsetNum);
            query += " ORDER BY timestamp DESC LIMIT $2 OFFSET $3"; // DESC to get most recent
        }

        const result = await db.query(query, params);

        // Reverse to show oldest first (chronological order)
        res.json({
            messages: result.rows.reverse(),
            hasMore: result.rows.length === limit // Se retornou exatamente o limit, provavelmente tem mais
        });
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
        // CRITICAL: Use UTC explicitly to avoid timezone issues
        const timestamp = new Date();

        const insert = await db.query(
            `INSERT INTO chat_logs 
            (tenant_id, contact_id, whatsapp_account_id, wamid, message, type, direction, status, timestamp, created_at) 
            VALUES ($1, $2, $3, $4, $5, 'text', 'OUTBOUND', 'sent', $6::timestamptz, $6::timestamptz)
            RETURNING *`,
            [tenantId, contactId, channel.id, wamid, content, timestamp.toISOString()]
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

// ==========================================
// ROTAS DE TAGS
// ==========================================

// Listar tags de um contato
router.get('/contacts/:contactId/tags', async (req, res) => {
    try {
        const { contactId } = req.params;
        const result = await db.query(
            'SELECT tags FROM contacts WHERE id = $1 AND tenant_id = $2',
            [contactId, req.tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contato não encontrado' });
        }

        res.json({ tags: result.rows[0].tags || [] });
    } catch (err) {
        console.error('Erro ao buscar tags:', err);
        res.status(500).json({ error: 'Erro ao buscar tags' });
    }
});

// Adicionar tag a um contato
router.post('/contacts/:contactId/tags', async (req, res) => {
    try {
        const { contactId } = req.params;
        const { tag } = req.body;

        if (!tag) {
            return res.status(400).json({ error: 'Tag é obrigatória' });
        }

        await db.query(`
            UPDATE contacts 
            SET tags = CASE 
                WHEN $2 = ANY(tags) THEN tags
                ELSE array_append(tags, $2)
            END
            WHERE id = $1 AND tenant_id = $3
        `, [contactId, tag, req.tenantId]);

        res.json({ message: 'Tag adicionada com sucesso' });
    } catch (err) {
        console.error('Erro ao adicionar tag:', err);
        res.status(500).json({ error: 'Erro ao adicionar tag' });
    }
});

// Remover tag de um contato
router.delete('/contacts/:contactId/tags/:tag', async (req, res) => {
    try {
        const { contactId, tag } = req.params;

        await db.query(`
            UPDATE contacts 
            SET tags = array_remove(tags, $2)
            WHERE id = $1 AND tenant_id = $3
        `, [contactId, tag, req.tenantId]);

        res.json({ message: 'Tag removida com sucesso' });
    } catch (err) {
        console.error('Erro ao remover tag:', err);
        res.status(500).json({ error: 'Erro ao remover tag' });
    }
});

module.exports = router;

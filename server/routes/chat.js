const express = require('express');
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const router = express.Router();

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tenantId = req.tenantId || (req.user && req.user.tenantId);
        // We need channelId to organize folders. If not in body (multipart), we might need to parse it or use default.
        // Since multer runs before body parsing for non-file fields might be tricky,
        // we'll use a temp folder first or rely on req.body if available (multer processes fields in order).
        // Let's use a meaningful default and move it later or just structure by tenant for now.
        // User requested: public/tenant/whatsapp_account.
        // We will try to get accountId from req.body or use 'default'.
        // NOTE: In multipart/form-data, text fields MUST come before file fields for req.body to be populated in destination.

        const accountId = req.body.channelId || 'general';
        const dir = path.join(__dirname, '..', 'public', 'uploads', String(tenantId), String(accountId));

        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        // Keep original extension
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage });

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
                c.email,
                c.custom_fields,
                c.notes,
                c.last_interaction,
                c.tags,
                c.channel,
                (SELECT message FROM chat_logs WHERE contact_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message,
                (SELECT type FROM chat_logs WHERE contact_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message_type,
                (SELECT timestamp FROM chat_logs WHERE contact_id = c.id ORDER BY timestamp DESC LIMIT 1) as last_message_time,
                (SELECT count(*) FROM chat_logs WHERE contact_id = c.id AND direction = 'INBOUND' AND status = 'unread') as unread_count,
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'id', d.id,
                            'title', d.title,
                            'pipeline_id', d.pipeline_id,
                            'pipeline_name', p.name,
                            'stage_id', d.stage_id,
                            'stage_name', ps.name,
                            'stage_color', ps.color
                        )
                    ), '[]')
                    FROM deals d
                    LEFT JOIN pipelines p ON d.pipeline_id = p.id
                    LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
                    WHERE d.contact_id = c.id
                ) as deals
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

// Nova rota: Listar todas as tags únicas do Tenant
router.get('/tags', async (req, res) => {
    try {
        const tenantId = req.tenantId || (req.user && req.user.tenantId);
        const result = await db.query(
            "SELECT DISTINCT unnest(tags) as tag FROM contacts WHERE tenant_id = $1 AND tags IS NOT NULL AND array_length(tags, 1) > 0 ORDER BY tag",
            [tenantId]
        );
        res.json(result.rows.map(r => r.tag));
    } catch (err) {
        console.error('Erro ao listar tags:', err);
        res.status(500).json({ error: 'Erro ao listar tags' });
    }
});

// Nova rota: Buscar contatos por tag
router.get('/contacts-by-tag', async (req, res) => {
    try {
        const { tag } = req.query;
        const tenantId = req.tenantId || (req.user && req.user.tenantId);

        if (!tag) return res.status(400).json({ error: 'Tag é obrigatória' });

        const result = await db.query(
            "SELECT id, name, phone, email, tags, custom_fields, notes FROM contacts WHERE tenant_id = $1 AND $2 = ANY(tags) ORDER BY name",
            [tenantId, tag]
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar contatos por tag:', err);
        res.status(500).json({ error: 'Erro ao buscar contatos por tag' });
    }
});

// Nova rota: Buscar detalhes completos de um contato
router.get('/contacts/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const tenantId = req.tenantId || (req.user && req.user.tenantId);

        // Buscar contato com suas informações completas
        const contactQuery = `
            SELECT 
                c.id,
                c.name,
                c.phone,
                c.email,
                c.custom_fields,
                c.notes,
                c.tags,
                c.last_interaction,
                c.created_at,
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'id', d.id,
                            'title', d.title,
                            'pipeline_id', d.pipeline_id,
                            'pipeline_name', p.name,
                            'stage_id', d.stage_id,
                            'stage_name', ps.name,
                            'stage_color', ps.color,
                            'value', d.value,
                            'status', d.status
                        )
                    ), '[]')
                    FROM deals d
                    LEFT JOIN pipelines p ON p.id = d.pipeline_id
                    LEFT JOIN pipeline_stages ps ON ps.id = d.stage_id
                    WHERE d.contact_id = c.id AND d.status = 'open'
                ) as deals
            FROM contacts c
            WHERE c.id = $1 AND c.tenant_id = $2
        `;

        const result = await db.query(contactQuery, [contactId, tenantId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Contato não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao buscar detalhes do contato:', err);
        res.status(500).json({ error: 'Erro ao buscar detalhes do contato' });
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

        let query = "SELECT *, file_path_mp3, file_path_ogg FROM chat_logs WHERE contact_id = $1";
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

// Marcar mensagens como lidas
router.post('/:contactId/read', async (req, res) => {
    const { contactId } = req.params;
    try {
        const tenantId = req.tenantId || (req.user && req.user.tenantId);
        await db.query(
            "UPDATE chat_logs SET status = 'read' WHERE contact_id = $1 AND tenant_id = $2 AND direction = 'INBOUND' AND status = 'unread'",
            [contactId, tenantId]
        );
        res.json({ message: 'Mensagens marcadas como lidas' });
    } catch (err) {
        console.error('Erro ao marcar como lido:', err);
        res.status(500).json({ error: 'Erro ao marcar como lido' });
    }
});

// 3. Enviar Mensagem (Texto) - COM STICKY CHANNEL
router.post('/:contactId/send', async (req, res) => {
    const { contactId } = req.params;
    const { type, content, channelId, template } = req.body;

    if (!content && type !== 'template' && type !== 'interactive') return res.status(400).json({ error: 'Conteúdo vazio.' });

    try {
        const tenantId = req.tenantId || (req.user && req.user.tenantId);

        // --- STICKY CHANNEL LOGIC ---
        let channelIdToUse = channelId || null; // Prioriza o canal enviado no body

        if (!channelIdToUse) {
            const lastMsgRes = await db.query(
                "SELECT whatsapp_account_id FROM chat_logs WHERE contact_id = $1 ORDER BY timestamp DESC LIMIT 1",
                [contactId]
            );

            if (lastMsgRes.rows.length > 0) {
                channelIdToUse = lastMsgRes.rows[0].whatsapp_account_id;
                console.log(`info: Mantendo conversa pelo canal ID: ${channelIdToUse}`);
            }
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

        // Buscar Telefone e Preferências
        const contactRes = await db.query("SELECT phone, custom_fields FROM contacts WHERE id = $1", [contactId]);
        if (contactRes.rows.length === 0) return res.status(404).json({ error: 'Contato não encontrado.' });

        const contactData = contactRes.rows[0];
        const contactPhone = contactData.phone;

        // Fallback: Se não tem histórico e não veio no body, tenta pegar do custom_fields
        if (!channelIdToUse && contactData.custom_fields && contactData.custom_fields.preferred_channel) {
            channelIdToUse = contactData.custom_fields.preferred_channel;
            console.log(`info: Usando canal preferencial do contato: ${channelIdToUse}`);
        }

        // Enviar para Meta API
        const url = `https://graph.facebook.com/v19.0/${channel.phone_number_id}/messages`;

        let payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: contactPhone
        };

        const msgType = type || 'text';

        // Separação limpa dos tipos de payload
        switch (msgType) {
            case 'template':
                if (!template || !template.name) {
                    return res.status(400).json({ error: 'Dados do template incompletos.' });
                }
                payload.type = "template";
                payload.template = template;
                break;

            case 'image':
                payload.type = "image";
                payload.image = { link: req.body.link || content };
                if (req.body.caption) payload.image.caption = req.body.caption;
                break;

            case 'video':
                payload.type = "video";
                payload.video = { link: req.body.link || content };
                if (req.body.caption) payload.video.caption = req.body.caption;
                break;

            case 'document':
                payload.type = "document";
                payload.document = { link: req.body.link || content };
                if (req.body.caption) payload.document.caption = req.body.caption;
                if (req.body.filename) payload.document.filename = req.body.filename;
                break;

            case 'audio':
                payload.type = "audio";
                payload.audio = { link: req.body.link || content };
                break;

            case 'sticker':
                payload.type = "sticker";
                payload.sticker = { link: req.body.link || content };
                break;

            case 'interactive':
                const interactiveData = req.body.interactive;
                if (!interactiveData) return res.status(400).json({ error: 'Dados interativos ausentes.' });

                payload.type = "interactive";
                payload.interactive = {};

                if (interactiveData.type === 'button') {
                    payload.interactive.type = "button";
                    payload.interactive.body = { text: interactiveData.body.text };
                    if (interactiveData.header) {
                        payload.interactive.header = { type: 'text', text: interactiveData.header.text };
                    }
                    if (interactiveData.footer) {
                        payload.interactive.footer = { text: interactiveData.footer.text };
                    }
                    payload.interactive.action = {
                        buttons: interactiveData.action.buttons.map(btn => ({
                            type: 'reply',
                            reply: { id: btn.reply.id, title: btn.reply.title }
                        }))
                    };
                } else if (interactiveData.type === 'list') {
                    payload.interactive.type = "list";
                    payload.interactive.body = { text: interactiveData.body.text };
                    if (interactiveData.header) {
                        payload.interactive.header = { type: 'text', text: interactiveData.header.text };
                    }
                    if (interactiveData.footer) {
                        payload.interactive.footer = { text: interactiveData.footer.text };
                    }
                    payload.interactive.action = {
                        button: interactiveData.action.button,
                        sections: interactiveData.action.sections
                    };
                }
                break;

            case 'text':
            default:
                if (!content) return res.status(400).json({ error: 'Conteúdo de texto vazio.' });
                payload.type = "text";
                payload.text = { body: content };
                break;
        }

        console.log('📤 [META PAYLOAD]', JSON.stringify(payload, null, 2));

        const metaRes = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${channel.permanent_token}`,
                'Content-Type': 'application/json'
            }
        });

        const wamid = metaRes.data.messages[0].id;

        // Salvar no Banco (OUTBOUND em UTC)
        const timestamp = new Date();

        // Define conteúdo visual para log
        let messageLogContent = content;
        if (msgType === 'template') {
            // Save full template content as JSON (User request: "salvar todo o template sem filtrar")
            // Use snapshot from frontend if available (contains full text), otherwise fallback to payload
            const templateToSave = req.body.template_snapshot || req.body.template;
            messageLogContent = JSON.stringify(templateToSave);
        }
        else if (['image', 'video', 'document', 'audio', 'sticker'].includes(msgType)) {
            const caption = req.body.caption ? ` - ${req.body.caption}` : '';
            const filename = req.body.filename ? ` (${req.body.filename})` : '';
            messageLogContent = `[${msgType.toUpperCase()}]${filename}${caption}`;
        }
        else if (msgType === 'interactive') {
            // Save full content as JSON for rich rendering in frontend
            messageLogContent = JSON.stringify(req.body.interactive);
        }

        const insert = await db.query(
            `INSERT INTO chat_logs 
            (tenant_id, contact_id, whatsapp_account_id, wamid, message, type, direction, status, channel, timestamp, created_at) 
            VALUES ($1, $2, $3, $4, $5, $7, 'OUTBOUND', 'sent', 'WhatsApp Business', $6::timestamptz, $6::timestamptz)
            RETURNING *`,
            [tenantId, contactId, channel.id, wamid, messageLogContent, timestamp.toISOString(), msgType]
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

// Criar contato manualmente
router.post('/contacts', async (req, res) => {
    try {
        const { name, phone, email, tags, custom_fields } = req.body;
        const tenantId = req.tenantId || (req.user && req.user.tenantId);

        if (!name || !phone) {
            return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
        }

        // Verificar se já existe
        const check = await db.query('SELECT id FROM contacts WHERE phone = $1 AND tenant_id = $2', [phone, tenantId]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'Já existe um contato com este telefone' });
        }

        const result = await db.query(
            'INSERT INTO contacts (tenant_id, name, phone, email, tags, channel, custom_fields, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *',
            [tenantId, name, phone, email || null, tags || [], 'Manual', custom_fields || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao criar contato:', err);
        res.status(500).json({ error: 'Erro ao criar contato' });
    }
});

// Atualizar contato
router.put('/contacts/:contactId', async (req, res) => {
    try {
        const { contactId } = req.params;
        const { name, phone, email, custom_fields, notes, tags } = req.body;
        const tenantId = req.tenantId || (req.user && req.user.tenantId);

        // Validar telefone se for alterado
        if (phone) {
            const cleanPhone = String(phone).replace(/\D/g, '');
            const dup = await db.query('SELECT id FROM contacts WHERE phone = $1 AND tenant_id = $2 AND id != $3', [cleanPhone, tenantId, contactId]);
            if (dup.rows.length > 0) return res.status(400).json({ error: 'Telefone já em uso por outro contato' });
        }

        const result = await db.query(`
            UPDATE contacts 
            SET 
                name = COALESCE($1, name),
                phone = COALESCE($2, phone),
                email = $3,
                custom_fields = COALESCE($4, custom_fields),
                notes = $5,
                tags = COALESCE($6, tags)
            WHERE id = $7 AND tenant_id = $8
            RETURNING *
        `, [
            name || null,
            phone ? String(phone).replace(/\D/g, '') : null,
            email || null, // Se undefined ou null, vira null. (Cuidado: Se frontend nao mandar email, vira null e apaga!)
            custom_fields || null,
            notes || null,
            tags || null,
            contactId,
            tenantId
        ]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Contato não encontrado' });

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Erro ao atualizar contato:', err);
        res.status(500).json({ error: 'Erro ao atualizar contato' });
    }
});

// Excluir contato e dados relacionados
router.delete('/contacts/:contactId', async (req, res) => {
    const { contactId } = req.params;
    const tenantId = req.tenantId || (req.user && req.user.tenantId);

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verificar se o contato pertence ao tenant
        const check = await client.query('SELECT id FROM contacts WHERE id = $1 AND tenant_id = $2', [contactId, tenantId]);
        if (check.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Contato não encontrado' });
        }

        // 2. Excluir logs de chat
        await client.query('DELETE FROM chat_logs WHERE contact_id = $1', [contactId]);

        // 3. Excluir deals (negócios)
        await client.query('DELETE FROM deals WHERE contact_id = $1', [contactId]);

        // 4. Excluir o contato
        await client.query('DELETE FROM contacts WHERE id = $1', [contactId]);

        await client.query('COMMIT');
        res.json({ message: 'Contato e todos os dados associados foram excluídos com sucesso' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao excluir contato:', err);
        res.status(500).json({ error: 'Erro ao excluir contato' });
    } finally {
        client.release();
    }
});

// Importação em Lote de Contatos (com Tag e Funil Opcionais)
router.post('/import-batch', verifyToken, async (req, res) => {
    const { contacts, tag, pipeline_id, stage_id } = req.body;
    const tenantId = req.tenantId || (req.user && req.user.tenantId);

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({ error: 'Lista de contatos é obrigatória' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const results = { imported: 0, skipped: 0, errors: [] };

        for (const contact of contacts) {
            try {
                if (!contact.phone || !contact.name) {
                    results.skipped++;
                    continue;
                }

                const phone = String(contact.phone).replace(/\D/g, '');

                // 1. Inserir ou buscar contato
                let contactId;
                const check = await client.query('SELECT id FROM contacts WHERE phone = $1 AND tenant_id = $2', [phone, tenantId]);

                if (check.rows.length > 0) {
                    contactId = check.rows[0].id;
                    if (tag || contact.email) {
                        await client.query(`
                            UPDATE contacts SET 
                                tags = CASE 
                                    WHEN $1 = ANY(tags) OR $1 IS NULL THEN tags 
                                    ELSE array_append(tags, $1) 
                                END,
                                email = COALESCE(email, $3)
                            WHERE id = $2
                        `, [tag || null, contactId, contact.email || null]);
                    }
                } else {
                    const insert = await client.query(
                        'INSERT INTO contacts (tenant_id, name, phone, email, tags, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id',
                        [tenantId, contact.name, phone, contact.email || null, tag ? [tag] : []]
                    );
                    contactId = insert.rows[0].id;
                }

                // 2. Adicionar ao Funil se solicitado
                if (pipeline_id && stage_id) {
                    // Verificar se já existe deal aberto para este contato neste pipeline
                    const dealCheck = await client.query(
                        "SELECT id FROM deals WHERE contact_id = $1 AND pipeline_id = $2 AND status = 'open'",
                        [contactId, pipeline_id]
                    );

                    if (dealCheck.rows.length === 0) {
                        await client.query(
                            `INSERT INTO deals (tenant_id, contact_id, pipeline_id, stage_id, title, value, status, created_at, updated_at) 
                             VALUES ($1, $2, $3, $4, $5, 0, 'open', NOW(), NOW())`,
                            [tenantId, contactId, pipeline_id, stage_id, contact.name]
                        );
                    }
                }
                results.imported++;
            } catch (itemErr) {
                console.error('Erro ao importar item:', itemErr);
                results.errors.push({ name: contact.name, error: itemErr.message });
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Processamento concluído', results });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro fatal na importação:', err);
        res.status(500).json({ error: 'Erro ao processar importação' });
    } finally {
        client.release();
    }
});

// Importação em massa de contatos
router.post('/import', async (req, res) => {
    const { contacts, tag, pipeline_id, stage_id } = req.body;
    const tenantId = req.tenantId || (req.user && req.user.tenantId);

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        return res.status(400).json({ error: 'Nenhum contato enviado para importação' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const importedIds = [];

        for (const contact of contacts) {
            const { name, phone, email } = contact;
            if (!name || !phone) continue;

            const cleanPhone = phone.replace(/\D/g, '');

            // 1. Criar ou Obter Contato
            let contactId;
            const check = await client.query('SELECT id, tags FROM contacts WHERE phone = $1 AND tenant_id = $2', [cleanPhone, tenantId]);

            if (check.rows.length > 0) {
                contactId = check.rows[0].id;
                if (tag || email) {
                    await client.query(`
                        UPDATE contacts 
                        SET 
                            tags = CASE WHEN $2 = ANY(tags) OR $2 IS NULL THEN tags ELSE array_append(tags, $2) END,
                            email = COALESCE(email, $3)
                        WHERE id = $1
                    `, [contactId, tag || null, email || null]);
                }
            } else {
                const result = await client.query(
                    'INSERT INTO contacts (tenant_id, name, phone, email, tags, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id',
                    [tenantId, name, cleanPhone, email || null, tag ? [tag] : []]
                );
                contactId = result.rows[0].id;
            }

            // 2. Criar Deal se pipeline e stage forem fornecidos
            if (pipeline_id && stage_id) {
                // Verificar se já tem deal nesse pipeline para este contato (opcional, mas evita duplicatas)
                const dealCheck = await client.query('SELECT id FROM deals WHERE contact_id = $1 AND pipeline_id = $2', [contactId, pipeline_id]);
                if (dealCheck.rows.length === 0) {
                    await client.query(
                        `INSERT INTO deals (tenant_id, contact_id, pipeline_id, stage_id, title, status, created_at, updated_at) 
                         VALUES ($1, $2, $3, $4, $5, 'open', NOW(), NOW())`,
                        [tenantId, contactId, pipeline_id, stage_id, name]
                    );
                }
            }
            importedIds.push(contactId);
        }

        await client.query('COMMIT');
        res.json({ message: `${importedIds.length} contatos processados com sucesso`, count: importedIds.length });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro na importação:', err);
        res.status(500).json({ error: 'Erro ao importar contatos' });
    } finally {
        client.release();
    }
});

// 4. Enviar Mídia (Upload Local -> Meta -> Send)
router.post('/:contactId/send-media', upload.single('file'), async (req, res) => {
    const { contactId } = req.params;
    const { type, caption, channelId } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    if (type === 'image') return res.status(400).json({ error: 'Envio de imagem deve usar a rota oficial v2.' });

    const tenantId = req.tenantId || (req.user && req.user.tenantId);

    // Utilitários de Arquivo
    const fileManager = require('../utils/fileManager');

    try {
        // --- 1. Identificar Channel ---
        let channelIdToUse = channelId;

        // Se não veio channelId, tenta pegar o último usado ou preferencial (Lógica Sticky simplificada aqui)
        if (!channelIdToUse) {
            const lastMsg = await db.query("SELECT whatsapp_account_id FROM chat_logs WHERE contact_id = $1 ORDER BY timestamp DESC LIMIT 1", [contactId]);
            if (lastMsg.rows.length > 0) channelIdToUse = lastMsg.rows[0].whatsapp_account_id;
        }

        const channelRes = await db.query("SELECT id, phone_number_id, permanent_token FROM whatsapp_accounts WHERE tenant_id = $1 AND id = $2", [tenantId, channelIdToUse]);
        if (channelRes.rows.length === 0) {
            // Fallback: pega o primeiro conectado
            const fallback = await db.query("SELECT id, phone_number_id, permanent_token FROM whatsapp_accounts WHERE tenant_id = $1 AND status = 'CONNECTED' LIMIT 1", [tenantId]);
            if (fallback.rows.length === 0) return res.status(400).json({ error: 'Nenhum canal conectado.' });
            channelIdToUse = fallback.rows[0].id;
        }

        const channel = (channelRes.rows.length > 0) ? channelRes.rows[0] : (await db.query("SELECT id, phone_number_id, permanent_token FROM whatsapp_accounts WHERE tenant_id = $1 AND status = 'CONNECTED' LIMIT 1", [tenantId])).rows[0];


        // --- 2. Processamento do Arquivo ---
        // Mover do temp (multer) para storage definitivo organizado
        const storageDir = fileManager.getStoragePath(tenantId, channel.id);
        const fileNameBase = `outbound_${Date.now()}`;
        const ext = path.extname(file.originalname);

        // Caminhos Absolutos para processamento
        const originalPath = path.join(storageDir, `${fileNameBase}${ext}`);

        // Mover arquivo do multer para o destino
        fs.renameSync(file.path, originalPath);

        let filePathOgg = null;
        let filePathMp3 = null;
        let finalMediaType = type || 'file';
        let mediaId = null;

        // Lógica Específica de Áudio
        if (type === 'audio' || file.mimetype.startsWith('audio/')) {
            finalMediaType = 'audio';
            const pathOgg = path.join(storageDir, `${fileNameBase}.ogg`);
            const pathMp3 = path.join(storageDir, `${fileNameBase}.mp3`);

            // Converter para OGG (Meta) e MP3 (Player)
            await Promise.all([
                fileManager.convertAudioToOgg(originalPath, pathOgg),
                fileManager.convertAudioToMp3(originalPath, pathMp3)
            ]);

            // Caminhos Relativos para o Banco
            filePathOgg = `/files/tenant_${tenantId}/channel_${channel.id}/${fileNameBase}.ogg`;
            filePathMp3 = `/files/tenant_${tenantId}/channel_${channel.id}/${fileNameBase}.mp3`;

            // Upload OGG para a Meta
            const formData = new FormData();
            formData.append('file', fs.createReadStream(pathOgg));
            formData.append('type', 'audio/ogg');
            formData.append('messaging_product', 'whatsapp');

            const uploadMeta = await axios.post(
                `https://graph.facebook.com/v19.0/${channel.phone_number_id}/media`,
                formData,
                { headers: { ...formData.getHeaders(), Authorization: `Bearer ${channel.permanent_token}` } }
            );
            mediaId = uploadMeta.data.id;

        } else {
            // Para outros arquivos
            const formData = new FormData();
            formData.append('file', fs.createReadStream(originalPath));
            formData.append('type', file.mimetype);
            formData.append('messaging_product', 'whatsapp');

            const uploadMeta = await axios.post(
                `https://graph.facebook.com/v19.0/${channel.phone_number_id}/media`,
                formData,
                { headers: { ...formData.getHeaders(), Authorization: `Bearer ${channel.permanent_token}` } }
            );
            mediaId = uploadMeta.data.id;
        }


        // --- 4. Enviar Mensagem ---
        const contactData = await db.query("SELECT phone FROM contacts WHERE id = $1", [contactId]);
        const contactPhone = contactData.rows[0].phone;

        let payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: contactPhone,
            type: finalMediaType
        };

        if (finalMediaType === 'audio') {
            payload.audio = { id: mediaId };
        } else if (finalMediaType === 'video') {
            payload.video = { id: mediaId, caption: caption || '' };
        } else if (finalMediaType === 'document') {
            payload.document = { id: mediaId, caption: caption || '', filename: file.originalname };
        } else {
            // Fallback para outros tipos (serão tratados como documento)
            payload.type = 'document';
            payload.document = { id: mediaId, caption: caption || '', filename: file.originalname };
        }

        const msgRes = await axios.post(
            `https://graph.facebook.com/v19.0/${channel.phone_number_id}/messages`,
            payload,
            { headers: { Authorization: `Bearer ${channel.permanent_token}` } }
        );

        const wamid = msgRes.data.messages[0].id;


        // --- 5. Salvar no Banco ---
        const insert = await db.query(
            `INSERT INTO chat_logs 
            (tenant_id, contact_id, whatsapp_account_id, wamid, message, type, direction, status, channel, timestamp, created_at,
             media_type, media_format, file_path_ogg, file_path_mp3, meta_media_id, file_name) 
            VALUES ($1, $2, $3, $4, $5, $6, 'OUTBOUND', 'sent', 'WhatsApp Business', NOW(), NOW(),
                    $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
                tenantId,
                contactId,
                channel.id,
                wamid,
                caption || (finalMediaType === 'audio' ? 'Áudio enviado' : 'Mídia enviada'),
                finalMediaType,
                finalMediaType,
                (finalMediaType === 'audio' ? 'ogg' : null),
                filePathOgg,
                filePathMp3,
                mediaId,
                file.originalname
            ]
        );

        const io = req.app.get('io');
        if (io) io.to(`tenant_${tenantId}`).emit('new_message', insert.rows[0]);

        res.json(insert.rows[0]);

    } catch (err) {
        console.error('Erro ao enviar mídia:', err);
        res.status(500).json({ error: 'Erro no processamento/envio da mídia.' });
    }
});

module.exports = router;

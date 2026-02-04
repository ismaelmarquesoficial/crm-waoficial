const db = require('../../db');

// Serviço para lidar com a lógica de banco de dados do Webhook
const WhatsAppService = {

    // 1. Encontrar ou Criar Contato
    async findOrCreateContact(tenantId, phone, pushName) {
        // Tenta achar
        const res = await db.query(
            "SELECT id FROM contacts WHERE tenant_id = $1 AND phone = $2",
            [tenantId, phone]
        );

        if (res.rows.length > 0) {
            // Atualiza última interação e nome se mudou (opcional, aqui só atualizamos last_interaction)
            await db.query(
                "UPDATE contacts SET last_interaction = NOW() WHERE id = $1",
                [res.rows[0].id]
            );
            return res.rows[0].id;
        } else {
            // Cria novo
            // Se precisar de um estágio padrão, pegamos o primeiro do pipeline padrao ou setamos NULL
            // Por simplicidade, vamos deixar null ou pegar o primeiro stage se existir lógica para isso.
            // Aqui vamos inserir sem stage_id inicial ou 0 se o banco permitir.
            // O schema diz integer, nullable.

            const insert = await db.query(
                "INSERT INTO contacts (tenant_id, phone, name, last_interaction, created_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id",
                [tenantId, phone, pushName || phone]
            );
            return insert.rows[0].id;
        }
    },

    // 2. Salvar Mensagem no Log
    async saveMessage(tenantId, contactId, accountId, messageData) {
        // Extrair dados da mensagem da Meta
        const wamid = messageData.id;
        const type = messageData.type;
        const timestamp = new Date(parseInt(messageData.timestamp) * 1000);
        console.log(`📥 [DEBUG] Processando INBOUND. Meta Unix: ${messageData.timestamp} | Convertido: ${timestamp.toString()}`);

        let body = '';
        let mediaUrl = null;
        let fileName = null;

        if (type === 'text') {
            body = messageData.text.body;
        } else if (type === 'image') {
            body = messageData.image.caption || '[Imagem]';
            // Em produção, você baixaria a mídia usando o ID e salvaria no S3.
            // Aqui vamos salvar o ID da mídia temporariamente ou null
            mediaUrl = messageData.image.id;
        } else {
            body = `[${type.toUpperCase()}]`;
        }

        const insert = await db.query(
            `INSERT INTO chat_logs 
            (tenant_id, contact_id, whatsapp_account_id, wamid, message, type, media_url, file_name, direction, timestamp, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'INBOUND', $9, $9)
            RETURNING *`,
            [tenantId, contactId, accountId, wamid, body, type, mediaUrl, fileName, timestamp]
        );

        return insert.rows[0];
    }
};

module.exports = WhatsAppService;

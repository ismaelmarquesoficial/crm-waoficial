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

        // 3. Verificar Gatilhos de Campanha (On Reply)
        await WhatsAppService.checkCampaignReply(tenantId, contactId, body);

        return insert.rows[0];
    },

    // 3. Lógica de Atribuição de Campanha
    async checkCampaignReply(tenantId, contactId, messageBody) {
        try {
            // Busca a campanha mais recente enviada para este contato que tenha regra 'on_reply'
            // Limitamos a campanhas de até 7 dias atrás para relevância
            const campaignRes = await db.query(`
                SELECT c.id, c.name, c.crm_pipeline_id, c.crm_stage_id
                FROM campaign_recipients cr
                JOIN campaigns c ON cr.campaign_id = c.id
                WHERE cr.tenant_id = $1 
                  AND cr.phone = (SELECT phone FROM contacts WHERE id = $2)
                  AND cr.status = 'sent'
                  AND c.crm_trigger_rule = 'on_reply'
                  AND c.status IN ('processing', 'completed')
                  AND cr.updated_at > NOW() - INTERVAL '7 days'
                ORDER BY cr.updated_at DESC
                LIMIT 1
            `, [tenantId, contactId]);

            if (campaignRes.rows.length === 0) return; // Nenhuma campanha elegível

            const camp = campaignRes.rows[0];

            if (!camp.crm_pipeline_id || !camp.crm_stage_id) return;

            // Verifica se JÁ existe um Deal neste pipeline/stage para este contato (Evitar duplicação)
            const exists = await db.query(`
                SELECT id FROM deals 
                WHERE contact_id = $1 AND pipeline_id = $2 AND stage_id = $3
            `, [contactId, camp.crm_pipeline_id, camp.crm_stage_id]);

            if (exists.rows.length > 0) return; // Deal já criado

            // CRIA O DEAL
            await db.query(`
                INSERT INTO deals (tenant_id, contact_id, pipeline_id, stage_id, title, status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, 'open', NOW(), NOW())
            `, [tenantId, contactId, camp.crm_pipeline_id, camp.crm_stage_id, `Resposta: ${camp.name}`]);

            console.log(`🎯 [CRM] Deal 'on_reply' criado para Contato ${contactId} na campanha ${camp.name}`);

        } catch (e) {
            console.error('Erro ao processar checkCampaignReply:', e);
        }
    }
};

module.exports = WhatsAppService;

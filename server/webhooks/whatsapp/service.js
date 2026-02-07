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
            // Atualiza última interação e garante que o canal está setado
            await db.query(
                "UPDATE contacts SET last_interaction = NOW(), channel = COALESCE(channel, 'WhatsApp Business') WHERE id = $1",
                [res.rows[0].id]
            );
            return res.rows[0].id;
        } else {
            // Cria novo contato com canal WhatsApp Business
            const insert = await db.query(
                "INSERT INTO contacts (tenant_id, phone, name, channel, last_interaction, created_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id",
                [tenantId, phone, pushName || phone, 'WhatsApp Business']
            );
            return insert.rows[0].id;
        }
    },

    // 2. Salvar Mensagem no Log
    async saveMessage(tenantId, contactId, accountId, messageData, io) {
        // Dependencies
        const axios = require('axios');
        const fs = require('fs');
        const path = require('path');
        const fileManager = require('../../utils/fileManager');

        // Extrair dados da mensagem da Meta
        const wamid = messageData.id;
        const type = messageData.type;
        const timestamp = new Date(parseInt(messageData.timestamp) * 1000);

        let body = '';
        let mediaUrl = null; // To store local public path or remote ID
        let fileName = null;

        let filePathOgg = null;
        let filePathMp3 = null;
        let mediaType = type; // 'text', 'audio', 'image', etc.
        let mediaFormat = null;
        let metaMediaId = null;

        if (type === 'text') {
            body = messageData.text.body;
        }
        else if (type === 'audio') {
            const audioObj = messageData.audio;
            metaMediaId = audioObj.id;
            body = '[AUDIO]';

            // --- Lógica de Download e Conversão ---
            try {
                // 1. Obter Token da Conta
                const accountRes = await db.query("SELECT permanent_token FROM whatsapp_accounts WHERE id = $1", [accountId]);
                if (accountRes.rows.length > 0) {
                    const token = accountRes.rows[0].permanent_token;

                    // 2. Obter URL de Download da Meta
                    const mediaInfoRes = await axios.get(`https://graph.facebook.com/v19.0/${metaMediaId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    const downloadUrl = mediaInfoRes.data.url;

                    // 3. Preparar Pastas
                    // Precisamos do channelId real (que é o accountId aqui)
                    const storageDir = fileManager.getStoragePath(tenantId, accountId);
                    const fileNameBase = `inbound_${messageData.timestamp}`; // Usar timestamp da msg

                    const pathOgg = path.join(storageDir, `${fileNameBase}.ogg`);
                    const pathMp3 = path.join(storageDir, `${fileNameBase}.mp3`);

                    // 4. Baixar o Arquivo (Stream)
                    const writer = fs.createWriteStream(pathOgg);
                    const response = await axios({
                        url: downloadUrl,
                        method: 'GET',
                        responseType: 'stream',
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    await new Promise((resolve, reject) => {
                        response.data.pipe(writer);
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    // 5. Converter para MP3
                    await fileManager.convertAudioToMp3(pathOgg, pathMp3);

                    // 6. Definir Caminhos para o Banco (Relativos)
                    filePathOgg = `/files/tenant_${tenantId}/channel_${accountId}/${fileNameBase}.ogg`;
                    filePathMp3 = `/files/tenant_${tenantId}/channel_${accountId}/${fileNameBase}.mp3`;

                    mediaUrl = filePathMp3; // Para compatibilidade com frontend antigo, se usar
                    mediaFormat = 'ogg'; // O original é OGG

                    console.log(`🎤 Áudio processado: ${filePathMp3}`);
                }
            } catch (err) {
                console.error('Erro ao baixar/converter áudio:', err.message);
                body = '[AUDIO - ERRO NO DOWNLOAD]';
            }

        }
        else if (type === 'image') {
            body = messageData.image.caption || '[Imagem]';
            metaMediaId = messageData.image.id;
            mediaType = 'image';

            try {
                const storageDir = AudioStorage.getStoragePath(tenantId, accountId);
                const fileNameBase = `inbound_${metaMediaId}`;
                const finalPath = path.join(storageDir, `${fileNameBase}.jpg`);

                if (!fs.existsSync(finalPath)) {
                    console.log(`📸 Baixando imagem da Meta: ${metaMediaId}`);
                    const downloadUrl = await Client.getMediaUrl(metaMediaId, channel.permanent_token);
                    const streamRes = await Client.downloadMediaStream(downloadUrl, channel.permanent_token);

                    const writer = fs.createWriteStream(finalPath);
                    streamRes.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });
                }

                mediaUrl = AudioStorage.getPublicUrl(tenantId, accountId, `${fileNameBase}.jpg`);
                console.log(`📸 Imagem salva: ${mediaUrl}`);
            } catch (err) {
                console.error('❌ Erro ao baixar imagem:', err.message);
                mediaUrl = null;
            }
        } else {
            body = `[${type.toUpperCase()}]`;
            if (messageData[type] && messageData[type].id) {
                metaMediaId = messageData[type].id;
            }
        }

        const insert = await db.query(
            `INSERT INTO chat_logs 
            (tenant_id, contact_id, whatsapp_account_id, wamid, message, type, media_url, file_name, direction, channel, status, timestamp, created_at,
             media_type, media_format, file_path_ogg, file_path_mp3, meta_media_id) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'INBOUND', 'WhatsApp Business', 'unread', $9::timestamptz, $9::timestamptz,
                    $10, $11, $12, $13, $14)
            RETURNING *`,
            [
                tenantId,
                contactId,
                accountId,
                wamid,
                body,
                type,
                mediaUrl,
                fileName,
                timestamp.toISOString(),
                mediaType,
                mediaFormat,
                filePathOgg,
                filePathMp3,
                metaMediaId
            ]
        );


        // 3. Verificar Gatilhos de Campanha (On Reply)
        await WhatsAppService.checkCampaignReply(tenantId, contactId, body, io);

        return insert.rows[0];
    },

    // 3. Lógica de Atribuição de Campanha
    async checkCampaignReply(tenantId, contactId, messageBody, io) {
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
            const newDeal = await db.query(`
                INSERT INTO deals (tenant_id, contact_id, pipeline_id, stage_id, title, status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, 'open', NOW(), NOW())
                RETURNING *
            `, [tenantId, contactId, camp.crm_pipeline_id, camp.crm_stage_id, `Resposta: ${camp.name}`]);

            console.log(`🎯 [CRM] Deal 'on_reply' criado para Contato ${contactId} na campanha ${camp.name}`);

            // 🚀 Socket Emit: Deal Created
            if (io) {
                io.to(`tenant_${tenantId}`).emit('crm_deal_update', {
                    type: 'created',
                    deal: newDeal.rows[0],
                    pipelineId: camp.crm_pipeline_id
                });
                console.log(`📡 Socket 'crm_deal_update' emitido para pipeline ${camp.crm_pipeline_id}`);
            }

        } catch (e) {
            console.error('Erro ao processar checkCampaignReply:', e);
        }
    }
};

module.exports = WhatsAppService;

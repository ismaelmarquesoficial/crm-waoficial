const db = require('../db');
const axios = require('axios');

// Configurações do Worker
const BATCH_SIZE_PER_TENANT = 5;
const CYCLE_INTERVAL_MS = 2000;
const MAX_RETRIES = 3;

let ioInstance = null; // Para armazenar o socket.io

/**
 * Worker de Disparo de Campanhas 
 * Lógica: Fair Share (Divisão Justa) entre Tenants
 */
const startWorker = (io) => {
    ioInstance = io;
    console.log('🚀 Worker de Disparo de Campanhas INICIADO (Modo Robusto).');

    const runCycle = async () => {
        try {
            await checkScheduledCampaigns();
            await processBatch();
        } catch (err) {
            console.error('🔥 Erro Crítico no Worker:', err.message);
        } finally {
            setTimeout(runCycle, CYCLE_INTERVAL_MS);
        }
    };

    runCycle();
};

// Verificar e Ativar Campanhas Agendadas
const checkScheduledCampaigns = async () => {
    try {
        const utcNow = new Date();
        const res = await db.query(`
            UPDATE campaigns 
            SET status = 'processing' 
            WHERE status = 'scheduled' AND scheduled_at <= $1
            RETURNING id, name
        `, [utcNow]);
        if (res.rowCount > 0) {
            console.log(`⏰ ${res.rowCount} campanha(s) agendada(s) iniciada(s):`, res.rows.map(c => c.name));
        }
    } catch (e) {
        console.error('Erro no Scheduler:', e);
    }
};

const processBatch = async () => {
    // 1. FAIR SHARE QUERY + BLUEPRINT DATA
    // Adicionado header_vars_count e body_vars_count na query
    const query = `
        SELECT r.id, r.phone, r.variables, r.tenant_id, r.campaign_id, 
               c.whatsapp_account_id, c.template_id, c.name as campaign_name,
               c.crm_pipeline_id, c.crm_stage_id, c.crm_trigger_rule,
               wa.waba_id, wa.phone_number_id, wa.permanent_token,
               wt.name as template_name, wt.language as template_lang, wt.components as template_components,
               wt.header_vars_count, wt.body_vars_count,
               wt.header_var_names, wt.body_var_names
        FROM (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY id) as rank
            FROM campaign_recipients
            WHERE status = 'pending'
        ) r
        JOIN campaigns c ON r.campaign_id = c.id
        JOIN whatsapp_accounts wa ON c.whatsapp_account_id = wa.id
        JOIN whatsapp_templates wt ON c.template_id = wt.id
        WHERE r.rank <= $1
        AND c.status = 'processing' 
        LIMIT 50;
    `;

    try {
        const result = await db.query(query, [BATCH_SIZE_PER_TENANT]);
        const messages = result.rows;

        // DEBUG DIAGNOSTICO SE NADA FOR ENCONTRADO
        if (messages.length === 0) {
            const debugCheck = await db.query("SELECT id, name, whatsapp_account_id, template_id FROM campaigns WHERE status = 'processing' LIMIT 1");
            if (debugCheck.rows.length > 0) {
                const c = debugCheck.rows[0];
                // Verifica se tem items pendentes
                const pending = await db.query("SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = $1 AND status = 'pending'", [c.id]);
                // Verifica conta
                const acc = await db.query("SELECT id FROM whatsapp_accounts WHERE id = $1", [c.whatsapp_account_id]);
                // Verifica template
                const tpl = await db.query("SELECT id FROM whatsapp_templates WHERE id = $1", [c.template_id]);

                console.warn(`⚠️ [WORKER DIAGNOSTIC] Campanha travada (${c.id} - ${c.name}). Pendentes: ${pending.rows[0].count}. AccountValida: ${acc.rows.length > 0}. TemplateValido: ${tpl.rows.length > 0}`);
            }
        }

        // Log apenas se houver atividade para não poluir o terminal
        if (messages.length > 0) {
            console.log(`⚙️ [WORKER] Processando lote de ${messages.length} mensagens...`);
        }

        if (messages.length === 0) return;

        // Agrupar mensagens por Tenant para paralelizar o atraso
        const msgsByTenant = messages.reduce((acc, msg) => {
            if (!acc[msg.tenant_id]) acc[msg.tenant_id] = [];
            acc[msg.tenant_id].push(msg);
            return acc;
        }, {});

        // Disparar processamento paralelo POR TENANT
        // Cada tenant roda seu fluxo sequencial com delay, independente dos outros
        await Promise.all(Object.keys(msgsByTenant).map(async (tenantId) => {
            const tenantMsgs = msgsByTenant[tenantId];

            for (const msg of tenantMsgs) {
                try {
                    // Monta Payload Inteligente Usando o BLUEPRINT do Banco
                    const payload = buildMetaPayload(
                        msg.phone,
                        msg.template_name,
                        msg.template_lang,
                        msg.header_vars_count || 0,
                        msg.body_vars_count || 0,
                        msg.header_var_names || [],
                        msg.body_var_names || [],
                        msg.variables
                    );

                    // DEBUG PAYLOAD
                    console.log(`📦 [WORKER T:${tenantId}] Payload para ${msg.phone}:`, JSON.stringify(payload.template.components));

                    // Envio para META
                    const url = `https://graph.facebook.com/v21.0/${msg.phone_number_id}/messages`;
                    const metaRes = await axios.post(url, payload, {
                        headers: {
                            Authorization: `Bearer ${msg.permanent_token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    const metaId = metaRes.data?.messages?.[0]?.id;
                    console.log(`✅ [WORKER T:${tenantId}] Sucesso msg ${msg.id}: ID Meta ${metaId}`);

                    // Atualizar status no DB
                    await db.query(
                        "UPDATE campaign_recipients SET status = 'sent', message_id = $1, updated_at = NOW() WHERE id = $2",
                        [metaId, msg.id]
                    );

                    // SALVAR NO HISTÓRICO DE CHAT (Para aparecer no CRM)
                    let bodyText = `[Template: ${msg.template_name}]`;
                    try {
                        const comps = typeof msg.template_components === 'string' ? JSON.parse(msg.template_components) : msg.template_components;
                        const body = comps.find(c => c.type === 'BODY');
                        if (body && body.text) bodyText = body.text;

                        // Substituição Visual para o Chatlog (apenas visual)
                        if (msg.variables && Array.isArray(msg.variables)) {
                            [...msg.variables].sort((a, b) => {
                                return String(a).localeCompare(String(b), undefined, { numeric: true });
                            }).forEach((v, i) => {
                                const val = (v === null || v === undefined) ? '' : String(v);
                                bodyText = bodyText.replace(new RegExp(`\\{\\{.*?\\}\\}`, ''), val);
                            });
                        }
                    } catch (e) { }

                    await insertChatLog(msg, metaId, bodyText);

                    // NOTIFICAR VIA SOCKET (Real-Time Magic ✨)
                    if (ioInstance) {
                        const room = `tenant_${msg.tenant_id}`;
                        ioInstance.to(room).emit('campaign_progress', {
                            campaign_id: msg.campaign_id,
                            status: 'sent',
                            phone: msg.phone
                        });
                    }

                } catch (error) {
                    // Log detalhado do erro da Meta
                    const errorData = error.response?.data || error.message;
                    console.error(`❌ [WORKER T:${tenantId}] Falha msg ${msg.id}:`, JSON.stringify(errorData, null, 2));

                    const errorMsg = JSON.stringify(errorData);

                    await db.query(
                        "UPDATE campaign_recipients SET status = 'failed', error_log = $1, updated_at = NOW() WHERE id = $2",
                        [errorMsg, msg.id]
                    );

                    // Notificar Falha com detalhes
                    if (ioInstance) {
                        const errorDetails = error.response?.data?.error || {};
                        const errorMessage = errorDetails.message || error.message;
                        const errorCode = errorDetails.code;

                        ioInstance.to(`tenant_${msg.tenant_id}`).emit('campaign_error', {
                            campaign_id: msg.campaign_id,
                            campaign_name: msg.campaign_name,
                            template_name: msg.template_name,
                            phone: msg.phone,
                            error_message: errorMessage,
                            error_code: errorCode,
                            timestamp: new Date().toISOString()
                        });

                        // Também emitir progresso para atualizar contador
                        ioInstance.to(`tenant_${msg.tenant_id}`).emit('campaign_progress', {
                            campaign_id: msg.campaign_id,
                            status: 'failed',
                            phone: msg.phone,
                            error: errorMessage
                        });
                    }
                }

                // DELAY ANTI-BAN POR TENANT (1s)
                await new Promise(r => setTimeout(r, 1000));
            }
        }));
        await checkCompletedCampaigns();

    } catch (err) {
        console.error('🔥 [WORKER_CRITICAL] Erro na query de batch:', err);
    }
};

const checkCompletedCampaigns = async () => {
    // Busca campanhas 'processing'
    const processing = await db.query("SELECT id, tenant_id FROM campaigns WHERE status = 'processing'");

    for (const camp of processing.rows) {
        // Verifica se ainda tem pendentes
        const pending = await db.query("SELECT 1 FROM campaign_recipients WHERE campaign_id = $1 AND status = 'pending' LIMIT 1", [camp.id]);

        if (pending.rows.length === 0) {
            // Check if there are any failed recipients
            const failed = await db.query(
                "SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = $1 AND status = 'failed'",
                [camp.id]
            );
            const sent = await db.query(
                "SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = $1 AND status = 'sent'",
                [camp.id]
            );

            const failedCount = parseInt(failed.rows[0].count);
            const sentCount = parseInt(sent.rows[0].count);
            const totalCount = failedCount + sentCount;

            let finalStatus = 'completed';
            if (failedCount > 0 && sentCount === 0) {
                // All failed
                finalStatus = 'failed';
            } else if (failedCount > 0) {
                // Some failed, some sent
                finalStatus = 'completed_with_errors';
            }

            // Se não tem pendentes, marca como completed/failed
            await db.query("UPDATE campaigns SET status = $1 WHERE id = $2", [finalStatus, camp.id]);

            // --- LÓGICA DE RECORRÊNCIA ---
            const fullCamp = await db.query("SELECT * FROM campaigns WHERE id = $1", [camp.id]);
            const c = fullCamp.rows[0];

            if (c.recurrence_type && c.recurrence_type !== 'none') {
                let nextDate = new Date(c.scheduled_at);
                const interval = c.recurrence_interval || 1;

                if (c.recurrence_type === 'daily') {
                    nextDate.setDate(nextDate.getDate() + interval);
                } else if (c.recurrence_type === 'weekly') {
                    nextDate.setDate(nextDate.getDate() + (7 * interval));
                    if (c.recurrence_day !== null) {
                        const currentDay = nextDate.getDay();
                        const diff = c.recurrence_day - currentDay;
                        nextDate.setDate(nextDate.getDate() + diff);
                    }
                } else if (c.recurrence_type === 'monthly') {
                    nextDate.setMonth(nextDate.getMonth() + interval);
                    if (c.recurrence_day !== null) {
                        nextDate.setDate(c.recurrence_day);
                    }
                }

                // Aplicar horário específico se definido
                if (c.recurrence_time) {
                    const [hours, minutes, seconds] = c.recurrence_time.split(':');
                    nextDate.setHours(parseInt(hours), parseInt(minutes), parseInt(seconds || 0), 0);
                }

                console.log(`🔄 [WORKER] Reagendando campanha recorrente ${c.id} (${c.name}) para ${nextDate.toISOString()}`);

                // Reagenda a campanha e reseta os contadores dos destinatários
                await db.query(
                    "UPDATE campaigns SET status = 'scheduled', scheduled_at = $1 WHERE id = $2",
                    [nextDate, c.id]
                );
                await db.query(
                    "UPDATE campaign_recipients SET status = 'pending', error_log = NULL, updated_at = NOW() WHERE campaign_id = $1",
                    [c.id]
                );
            }

            // Avisa o Frontend que acabou!
            if (ioInstance) {
                ioInstance.to(`tenant_${camp.tenant_id}`).emit('campaign_completed', {
                    campaign_id: camp.id,
                    status: finalStatus,
                    failed_count: failedCount,
                    sent_count: sentCount
                });
            }
            console.log(`✅ Campanha ${camp.id} finalizada com status: ${finalStatus} (${sentCount} enviadas, ${failedCount} falhas)`);
        }
    }
};

// --- Helpers para Chat Log ---

const findContactId = async (tenantId, phone) => {
    const res = await db.query("SELECT id FROM contacts WHERE tenant_id = $1 AND phone = $2", [tenantId, phone]);
    if (res.rows.length > 0) return res.rows[0].id;
    console.log(`👤 [WORKER] Criando novo contato lead frio: ${phone}`);
    const insert = await db.query(
        "INSERT INTO contacts (tenant_id, phone, name, last_interaction, created_at) VALUES ($1, $2, $2, NOW(), NOW()) RETURNING id",
        [tenantId, phone]
    );
    return insert.rows[0].id;
};

const insertChatLog = async (msg, metaId, bodyText) => {
    try {
        const contactId = await findContactId(msg.tenant_id, msg.phone);
        const timestamp = new Date(); // UTC Node.js
        const result = await db.query(
            `INSERT INTO chat_logs 
            (tenant_id, contact_id, whatsapp_account_id, wamid, message, type, direction, timestamp, created_at) 
            VALUES ($1, $2, $3, $4, $5, 'template', 'OUTBOUND', $6::timestamptz, $6::timestamptz)
            RETURNING *`,
            [msg.tenant_id, contactId, msg.whatsapp_account_id, metaId, bodyText, timestamp.toISOString()]
        );
        console.log(`✅ [WORKER] ChatLog salvo com sucesso! ID Contato: ${contactId} | Time: ${timestamp.toISOString()}`);

        // Emit socket event to notify frontend
        if (ioInstance) {
            ioInstance.to(`tenant_${msg.tenant_id}`).emit('new_message', {
                contactId: contactId,
                message: result.rows[0]
            });
        }

        // --- CRM TRIGGER (ON SENT) ---
        if (msg.crm_trigger_rule === 'on_sent' && msg.crm_pipeline_id && msg.crm_stage_id) {
            await createDeal(msg.tenant_id, contactId, msg.crm_pipeline_id, msg.crm_stage_id, msg.campaign_name, msg.phone);
        }

    } catch (e) {
        console.error('⚠️ [WORKER] FALHA ao salvar log de chat:', e);
    }
};

const createDeal = async (tenantId, contactId, pipelineId, stageId, title, phone) => {
    try {
        // Evitar duplicidade abusiva (Opcional: verifica se já tem deal nesse stage recém criado? 
        // Por enquanto, vamos permitir multiplos deals pois pode ser campanha diferente)

        await db.query(
            `INSERT INTO deals (tenant_id, contact_id, pipeline_id, stage_id, title, status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'open', NOW(), NOW())`,
            [tenantId, contactId, pipelineId, stageId, `Campanha: ${title}`]
        );
        console.log(`💼 [CRM] Deal criado para ${phone} via Campanha.`);
    } catch (e) {
        console.error('⚠️ [CRM] Falha ao criar Deal:', e);
    }
};

// ==========================================
// BUILD META PAYLOAD - LOGICA DEFINITIVA (BLUEPRINT BASED)
// ==========================================
const buildMetaPayload = (phone, templateName, lang, headerCount, bodyCount, headerNames, bodyNames, variables) => {
    // 1. Sanitizar Variáveis e Aplicar Fallback Global
    const safeVars = Array.isArray(variables)
        ? variables.map(v => (v === null || v === undefined || v === '') ? '-' : String(v))
        : [];

    // Estrutura do Payload
    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "template",
        template: {
            name: templateName,
            language: { code: lang },
            components: []
        }
    };

    let varCursor = 0; // Ponteiro para consumir o array safeVars

    // 2. Montar HEADER (Se o Blueprint disser que tem variáveis)
    if (headerCount > 0) {
        const headerVars = safeVars.slice(varCursor, varCursor + headerCount);
        while (headerVars.length < headerCount) headerVars.push('-');

        varCursor += headerCount;

        payload.template.components.push({
            type: "header",
            parameters: headerVars.map((v, i) => ({
                type: "text",
                parameter_name: String(i + 1), // Tenta enviar nome sequencial para satisfazer Meta Named strict
                text: v
            }))
        });
    }

    // 3. Montar BODY (Se o Blueprint disser que tem variáveis)
    if (bodyCount > 0) {
        const bodyVars = safeVars.slice(varCursor, varCursor + bodyCount);

        // Completa se faltar
        while (bodyVars.length < bodyCount) {
            bodyVars.push('-');
        }

        varCursor += bodyCount; // (Opcional, caso tivesse botões depois)

        payload.template.components.push({
            type: "body",
            parameters: bodyVars.map((v, i) => ({
                type: "text",
                parameter_name: String(i + 1), // Tenta enviar nome sequencial
                text: v
            }))
        });
    }

    console.log(`⚙️ [Blueprint DEBUG] H:${headerCount}, B:${bodyCount} | Vars sent: ${safeVars.length}`);

    return payload;
};

module.exports = { startWorker };

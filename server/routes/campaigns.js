const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

// Listar Campanhas
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT c.*, 
             wa.instance_name as channel_name,
             wt.name as template_name,
             (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = c.id) as total,
             (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = c.id AND status = 'sent') as sent,
             (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = c.id AND status = 'failed') as failed
             FROM campaigns c 
             LEFT JOIN whatsapp_accounts wa ON c.whatsapp_account_id = wa.id
             LEFT JOIN whatsapp_templates wt ON c.template_id = wt.id
             WHERE c.tenant_id = $1 
             ORDER BY c.created_at DESC`,
            [req.tenantId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar campanhas.' });
    }
});

// Listar Destinatários de uma Campanha (Para Duplicação)
router.get('/:id/recipients', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT phone, variables FROM campaign_recipients 
             WHERE campaign_id = $1 AND tenant_id = $2`,
            [req.params.id, req.tenantId]
        );
        // Formata variáveis se necessário (o banco devolve JSONB como objeto já)
        const recipients = result.rows.map(r => ({
            phone: r.phone,
            variables: r.variables || [],
            name: (r.variables && r.variables[0]) ? r.variables[0] : ''
        }));
        res.json(recipients);
    } catch (err) {
        res.status(500).json({ error: 'Erro ao buscar destinatários.' });
    }
});

// Criar Nova Campanha (Recebe Nome, Template, CSV parseado)
router.post('/', async (req, res) => {
    console.log('📥 [CAMPAIGN] Recebendo requisição de criação...');
    const {
        name,
        channelId,
        templateId,
        scheduledAt,
        recipients,
        message,
        mediaUrl,
        mediaType,
        crmPipelineId,
        crmStageId,
        crmTriggerRule,
        recurrenceType,
        recurrenceInterval,
        recurrenceDay,
        recurrenceTime      // Novo
    } = req.body;

    console.log(`📋 Dados recebidos: Nome=${name}, Channel=${channelId}, Template=${templateId}, Recipientes=${recipients?.length}, Recurrence=${recurrenceType}, Time=${recurrenceTime}`);

    // ... (validação mantida igual) ...

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();
        const initialStatus = isScheduled ? 'scheduled' : 'processing';
        const scheduleTime = scheduledAt || new Date();

        const campResult = await client.query(
            `INSERT INTO campaigns 
             (tenant_id, whatsapp_account_id, template_id, name, status, scheduled_at, created_at,
              message, media_url, media_type, crm_pipeline_id, crm_stage_id, crm_trigger_rule,
              recurrence_type, recurrence_interval, recurrence_day, recurrence_time)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
             RETURNING id`,
            [
                req.tenantId,
                channelId,
                templateId,
                name,
                initialStatus,
                scheduleTime,
                message,
                mediaUrl,
                mediaType,
                crmPipelineId || null,
                crmStageId || null,
                crmTriggerRule || 'none',
                recurrenceType || 'none',
                recurrenceInterval || null,
                recurrenceDay || null,
                recurrenceTime || null
            ]
        );
        const campaignId = campResult.rows[0].id;

        // 2. Inserir Destinatários (Bulk Insert Otimizado)
        // Montar query gigante ou usar loop com prepare.
        // Para mil contatos, um loop simples de insert é lento. Melhor construir VALUES ($1...), ($2...)..
        // Mas o driver 'pg' aceita query parametrizada. Vamos fazer chunks de 100 para não estourar params.

        const chunkSize = 100;
        for (let i = 0; i < recipients.length; i += chunkSize) {
            const chunk = recipients.slice(i, i + chunkSize);

            // Construir Values: ($1, $2, $3, $4, 'pending'), ($6, $7...)
            const values = [];
            const params = [];
            let paramIdx = 1;

            chunk.forEach(r => {
                values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, 'pending')`);
                params.push(campaignId, req.tenantId, r.phone, JSON.stringify(r.variables || []));
                paramIdx += 4;
            });

            const queryText = `
                INSERT INTO campaign_recipients (campaign_id, tenant_id, phone, variables, status)
                VALUES ${values.join(', ')}
            `;

            await client.query(queryText, params);
        }

        console.log(`✅ [CAMPAIGN CREATE] ID=${campaignId}, Status=${initialStatus}, Recipients=${recipients.length}, AccountID=${channelId}, TemplateID=${templateId}`);

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Campanha criada com sucesso!',
            id: campaignId,
            status: initialStatus,
            total_recipients: recipients.length
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar campanha.' });
    } finally {
        client.release();
    }
});

// Pausar/Retomar Campanha
router.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'paused', 'processing'
    try {
        await db.query("UPDATE campaigns SET status = $1 WHERE id = $2 AND tenant_id = $3", [status, id, req.tenantId]);
        res.json({ message: 'Status atualizado.' });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao atualizar status.' });
    }
});

// Reagendar / Repetir Falhas
router.patch('/:id/reschedule', async (req, res) => {
    console.log(`🔄 [API] Requisição de Reagendamento recebida para Campanha ID: ${req.params.id}`);
    const { id } = req.params;
    const { scheduledAt } = req.body;

    const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();
    const newStatus = isScheduled ? 'scheduled' : 'processing';
    const scheduleTime = scheduledAt || new Date();

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Atualizar Campanha (SEM updated_at, pois a tabela não tem)
        await client.query(
            `UPDATE campaigns 
             SET status = $1, scheduled_at = $2
             WHERE id = $3 AND tenant_id = $4`,
            [newStatus, scheduleTime, id, req.tenantId]
        );

        // 2. Resetar destinatários falhos ou pendentes (mantém enviados)
        // ATENÇÃO: campaign_recipients TEM updated_at.
        const resUpd = await client.query(
            `UPDATE campaign_recipients 
             SET status = 'pending', error_log = NULL, updated_at = NOW() 
             WHERE campaign_id = $1 AND tenant_id = $2 
             AND (status = 'failed' OR status = 'pending')`, // Pega os que falharam ou que sobraram
            [id, req.tenantId]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Campanha reagendada com sucesso!',
            status: newStatus,
            requeued_count: resUpd.rowCount
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao reagendar campanha.' });
    } finally {
        client.release();
    }
});

// Excluir Campanha
router.delete('/:id', async (req, res) => {
    console.log(`🗑️ [API] DELETE Campaign ID: ${req.params.id} | Tenant: ${req.tenantId}`);
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const { id } = req.params;

        // 1. Apagar recipients (O histórico visual fica em chat_logs, então isso é seguro para limpeza)
        await client.query("DELETE FROM campaign_recipients WHERE campaign_id = $1 AND tenant_id = $2", [id, req.tenantId]);

        // 2. Apagar campanha
        const result = await client.query("DELETE FROM campaigns WHERE id = $1 AND tenant_id = $2 RETURNING id", [id, req.tenantId]);

        if (result.rowCount === 0) {
            console.warn(`⚠️ [API] Delete falhou: Campanha ${id} não encontrada para Tenant ${req.tenantId}`);
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Campanha não encontrada.' });
        }

        await client.query('COMMIT');
        console.log(`✅ [API] Delete Sucesso: Campanha ${id}`);
        res.json({ message: 'Campanha excluída com sucesso.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir campanha.' });
    } finally {
        client.release();
    }
});

// Atualizar Campanha (Edição completa)
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, channelId, templateId, scheduledAt, recipients, crmPipelineId, crmStageId, crmTriggerRule, recurrenceType, recurrenceInterval, recurrenceDay, recurrenceTime } = req.body;

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();
        const newStatus = isScheduled ? 'scheduled' : 'processing';

        // 1. Atualizar dados básicos
        await client.query(
            `UPDATE campaigns SET 
                name = $1, whatsapp_account_id = $2, template_id = $3, 
                scheduled_at = $4, status = $5,
                crm_pipeline_id = $6, crm_stage_id = $7, crm_trigger_rule = $8,
                recurrence_type = $9, recurrence_interval = $10, 
                recurrence_day = $11, recurrence_time = $12
             WHERE id = $13 AND tenant_id = $14`,
            [
                name, channelId, templateId, scheduledAt, newStatus,
                crmPipelineId, crmStageId, crmTriggerRule,
                recurrenceType, recurrenceInterval, recurrenceDay, recurrenceTime,
                id, req.tenantId
            ]
        );

        // 2. Se destinatários foram enviados, substituir
        if (recipients && recipients.length > 0) {
            await client.query("DELETE FROM campaign_recipients WHERE campaign_id = $1 AND tenant_id = $2", [id, req.tenantId]);

            const chunkSize = 100;
            for (let i = 0; i < recipients.length; i += chunkSize) {
                const chunk = recipients.slice(i, i + chunkSize);
                const values = [];
                const params = [];
                let paramIdx = 1;

                chunk.forEach(r => {
                    values.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, 'pending')`);
                    params.push(id, req.tenantId, r.phone, JSON.stringify(r.variables || []));
                    paramIdx += 4;
                });

                await client.query(`INSERT INTO campaign_recipients (campaign_id, tenant_id, phone, variables, status) VALUES ${values.join(', ')}`, params);
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Campanha atualizada com sucesso!' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar campanha.' });
    } finally {
        client.release();
    }
});

module.exports = router;

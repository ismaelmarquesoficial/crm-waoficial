const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');

// Buscar Pipelines e seus Estágios
router.get('/pipelines', verifyToken, async (req, res) => {
    try {
        // Busca os pipelines do tenant
        // ATENÇÃO: Auth middleware pode estar salvando em req.user ou req.tenantId. 
        // Vamos garantir fallback
        const tenantId = req.tenantId || (req.user && req.user.tenantId);

        const pipelinesResult = await db.query(
            'SELECT * FROM pipelines WHERE tenant_id = $1 ORDER BY id',
            [tenantId]
        );

        // Se não houver pipeline, retorna array vazio
        if (pipelinesResult.rows.length === 0) {
            return res.json([]);
        }

        const pipelines = pipelinesResult.rows;

        const stagesQuery = `
      SELECT ps.*, p.id as pipeline_id_ref
      FROM pipeline_stages ps
      JOIN pipelines p ON ps.pipeline_id = p.id
      WHERE p.tenant_id = $1
      ORDER BY p.id, ps.order_index
    `;

        const stagesResult = await db.query(stagesQuery, [tenantId]);
        const stages = stagesResult.rows;

        const response = pipelines.map(pipeline => ({
            ...pipeline,
            stages: stages.filter(stage => stage.pipeline_id === pipeline.id)
        }));

        res.json(response);

    } catch (err) {
        console.error('Erro ao buscar pipelines:', err);
        res.status(500).json({ error: 'Erro ao buscar dados do CRM' });
    }
});

// Busca os Cards (Contatos/Deals) de um Pipeline
router.get('/pipelines/:pipelineId/cards', verifyToken, async (req, res) => {
    const { pipelineId } = req.params;

    try {
        const tenantId = req.tenantId || (req.user && req.user.tenantId);

        // Valida se o pipeline pertence ao tenant
        const pipelineCheck = await db.query(
            'SELECT id FROM pipelines WHERE id = $1 AND tenant_id = $2',
            [pipelineId, tenantId]
        );

        if (pipelineCheck.rows.length === 0) {
            console.log(`Pipeline ${pipelineId} não encontrado para tenant ${tenantId}`);
            return res.status(404).json({ error: 'Pipeline não encontrado' });
        }

        // Alteração: Ler de DEALS em vez de apenas CONTACTS
        const query = `
            SELECT 
                d.id, d.title, d.value, d.status, d.created_at,
                d.stage_id as current_stage_id, 
                c.id as contact_id, c.name, c.phone
            FROM deals d
            JOIN contacts c ON d.contact_id = c.id
            WHERE d.pipeline_id = $1 AND d.tenant_id = $2
            ORDER BY d.created_at DESC
        `;

        const result = await db.query(query, [pipelineId, tenantId]);

        console.log(`Buscando DEALS para Pipeline ${pipelineId}, Tenant ${tenantId}. Encontrados: ${result.rows.length}`);

        res.json(result.rows);

    } catch (err) {
        console.error('Erro ao buscar cards:', err);
        res.status(500).json({ error: 'Erro ao buscar cards' });
    }
});

// Buscar Negócios de um Contato Específico
router.get('/contacts/:contactId/deals', verifyToken, async (req, res) => {
    const { contactId } = req.params;
    const tenantId = req.tenantId || (req.user && req.user.tenantId);

    try {
        const query = `
            SELECT 
                d.id, d.title, d.value, d.status, d.created_at,
                d.pipeline_id, p.name as pipeline_name,
                d.stage_id, ps.name as stage_name, ps.color as stage_color
            FROM deals d
            JOIN pipelines p ON d.pipeline_id = p.id
            JOIN pipeline_stages ps ON d.stage_id = ps.id
            WHERE d.contact_id = $1 AND d.tenant_id = $2
            ORDER BY d.created_at DESC
        `;

        const result = await db.query(query, [contactId, tenantId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar negócios do contato:', err);
        res.status(500).json({ error: 'Erro ao buscar negócios' });
    }
});

// Criar Pipeline Rápido
router.post('/pipelines', verifyToken, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome obrigatório' });

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const tenantId = req.tenantId || (req.user && req.user.tenantId);

        // 1. Criar Pipeline
        const pipeRes = await client.query(
            "INSERT INTO pipelines (tenant_id, name) VALUES ($1, $2) RETURNING id",
            [tenantId, name]
        );
        const pipelineId = pipeRes.rows[0].id;

        // 2. Criar Etapas (Se vier customizado, usa. Se não, usa padrão)
        const customStages = req.body.stages;
        const defaultStages = [
            { name: 'Disparado', color: '#3B82F6' }, // Blue
            { name: 'Respondeu', color: '#EAB308' }, // Yellow
            { name: 'Negociando', color: '#F97316' }, // Orange
            { name: 'Vendeu', color: '#22C55E' }     // Green
        ];

        const stages = (customStages && Array.isArray(customStages) && customStages.length > 0)
            ? customStages
            : defaultStages;

        const createdStages = [];
        for (let i = 0; i < stages.length; i++) {
            const resStage = await client.query(
                "INSERT INTO pipeline_stages (pipeline_id, name, order_index, color) VALUES ($1, $2, $3, $4) RETURNING id",
                [pipelineId, stages[i].name, i, stages[i].color]
            );
            createdStages.push({ ...stages[i], id: resStage.rows[0].id });
        }

        await client.query('COMMIT');

        // Retornar objeto completo IDS REAIS
        res.json({ id: pipelineId, name, stages: createdStages });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar pipeline.' });
    } finally {
        client.release();
    }
});

// Adicionar Estágio a um Pipeline Existente
router.post('/pipelines/:id/stages', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { name, color } = req.body;
    const tenantId = req.tenantId || (req.user && req.user.tenantId);

    if (!name) return res.status(400).json({ error: 'Nome do estágio é obrigatório.' });

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Verificar se pipeline existe
        const pipeCheck = await client.query('SELECT id FROM pipelines WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        if (pipeCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Pipeline não encontrado' });
        }

        // Pegar o maior index atual
        const maxIdxRes = await client.query('SELECT MAX(order_index) as max_idx FROM pipeline_stages WHERE pipeline_id = $1', [id]);
        const nextIdx = (maxIdxRes.rows[0].max_idx !== null) ? maxIdxRes.rows[0].max_idx + 1 : 0;

        // Criar estágio
        const newStage = await client.query(
            "INSERT INTO pipeline_stages (pipeline_id, name, order_index, color) VALUES ($1, $2, $3, $4) RETURNING *",
            [id, name, nextIdx, color || '#cbd5e1']
        );

        await client.query('COMMIT');
        res.status(201).json(newStage.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao adicionar estágio:', err);
        res.status(500).json({ error: 'Erro ao adicionar estágio.' });
    } finally {
        client.release();
    }
});

// Criar Novo Deal (Manual)
router.post('/deals', verifyToken, async (req, res) => {
    const { name, phone, value, pipeline_id, stage_id } = req.body;
    const tenantId = req.tenantId || (req.user && req.user.tenantId);

    if (!name || !phone || !pipeline_id || !stage_id) {
        return res.status(400).json({ error: 'Dados incompletos (nome, telefone, pipeline, etapa são obrigatórios).' });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verificar se contato já existe (pelo telefone)
        let contactId;
        const contactCheck = await client.query(
            'SELECT id FROM contacts WHERE phone = $1 AND tenant_id = $2',
            [phone, tenantId]
        );

        if (contactCheck.rows.length > 0) {
            contactId = contactCheck.rows[0].id;
        } else {
            // Criar contato
            const newContact = await client.query(
                'INSERT INTO contacts (tenant_id, name, phone) VALUES ($1, $2, $3) RETURNING id',
                [tenantId, name, phone]
            );
            contactId = newContact.rows[0].id;
        }

        // 2. Criar Deal
        const deal = await client.query(
            `INSERT INTO deals (tenant_id, contact_id, pipeline_id, stage_id, title, value, status, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, 'open', NOW(), NOW()) RETURNING *`,
            [tenantId, contactId, pipeline_id, stage_id, name, value || 0]
        );

        // 3. (Opcional) Poderia criar task de follow-up etc.

        await client.query('COMMIT');

        // Retornar objeto combinado (deal + contact info para o frontend)
        const responseData = {
            ...deal.rows[0],
            contact_id: contactId,
            name: name,
            phone: phone,
            current_stage_id: stage_id
        };

        // Emitir evento socket
        const io = req.app.get('io');
        if (io) {
            io.to(`tenant_${tenantId}`).emit('crm_deal_update', {
                type: 'created',
                deal: deal.rows[0],
                pipelineId: pipeline_id
            });
        }

        res.status(201).json(responseData);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar deal:', err);
        res.status(500).json({ error: 'Erro ao criar negócio: ' + err.message });
    } finally {
        client.release();
    }
});

// Atualizar Deal (Mover de Etapa)
router.put('/deals/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { stage_id, status, value, title } = req.body;
    const tenantId = req.tenantId || (req.user && req.user.tenantId);

    try {
        // Verifica se o deal existe e pertence ao tenant
        const check = await db.query('SELECT id FROM deals WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        if (check.rows.length === 0) return res.status(404).json({ error: 'Deal não encontrado' });

        // Monta query dinâmica
        const updates = [];
        const values = [];
        let idx = 1;

        if (stage_id !== undefined) { updates.push(`stage_id = $${idx++}`); values.push(stage_id); }
        if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }
        if (value !== undefined) { updates.push(`value = $${idx++}`); values.push(value); }
        if (title !== undefined) { updates.push(`title = $${idx++}`); values.push(title); }

        updates.push(`updated_at = NOW()`);

        if (updates.length > 1) { // >1 porque updated_at sempre está lá
            values.push(id);
            const query = `UPDATE deals SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
            const result = await db.query(query, values);

            // Emitir evento socket se possível (idealmente)
            const io = req.app.get('io');
            if (io) {
                // Pequeno hack: emitir update genérico ou específico
                io.to(`tenant_${tenantId}`).emit('crm_deal_update', {
                    type: 'updated',
                    deal: result.rows[0],
                    pipelineId: result.rows[0].pipeline_id
                });
            }

            res.json(result.rows[0]);
        } else {
            res.json({ message: 'Nada a atualizar' });
        }

    } catch (err) {
        console.error('Erro ao atualizar deal:', err);
        res.status(500).json({ error: 'Erro ao atualizar deal' });
    }
});

// Excluir Pipeline
router.delete('/pipelines/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const tenantId = req.tenantId || (req.user && req.user.tenantId);

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // Verifica propriedade
        const check = await client.query('SELECT id FROM pipelines WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        if (check.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Pipeline não encontrado' });
        }

        // 0. Atualizar Campanhas que referenciam este pipeline e seus estágios
        // Resolve erros de constraint "campaigns_crm_pipeline_id_fkey" e "campaigns_crm_stage_id_fkey"

        // A. Remover referência do pipeline
        // (Assumindo que exista uma coluna crm_pipeline_id ou similar que causou o erro relatado)
        // O erro diz: "violates foreign key constraint 'campaigns_crm_pipeline_id_fkey' on table 'campaigns'"
        // Logo, a tabela campaigns tem uma coluna (provavelmente crm_pipeline_id) apontando para pipelines(id)
        try {
            await client.query('UPDATE campaigns SET crm_pipeline_id = NULL WHERE crm_pipeline_id = $1', [id]);
        } catch (ign) {
            // Se a coluna não existir ou nome for diferente, logamos mas tentamos seguir.
            // Mas dado o erro, ela existe.
            console.log('Tentativa de limpar crm_pipeline_id em campaigns (pode não existir coluna, mas o erro indicou que sim).');
        }

        // B. Remover referência dos estágios
        const stages = await client.query('SELECT id FROM pipeline_stages WHERE pipeline_id = $1', [id]);
        if (stages.rows.length > 0) {
            const stageIds = stages.rows.map(s => s.id);
            await client.query('UPDATE campaigns SET crm_stage_id = NULL WHERE crm_stage_id = ANY($1)', [stageIds]);
        }

        // 1. Deletar Deals relacionados
        await client.query('DELETE FROM deals WHERE pipeline_id = $1', [id]);

        // 2. Deletar Estágios relacionados
        await client.query('DELETE FROM pipeline_stages WHERE pipeline_id = $1', [id]);

        // 3. Deletar Pipeline
        await client.query('DELETE FROM pipelines WHERE id = $1', [id]);

        await client.query('COMMIT');
        res.json({ message: 'Pipeline excluído com sucesso' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro ao excluir pipeline:', err);
        res.status(500).json({ error: 'Erro ao excluir pipeline: ' + err.message });
    } finally {
        client.release();
    }
});

module.exports = router;

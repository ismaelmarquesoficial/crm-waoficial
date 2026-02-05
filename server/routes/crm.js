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

        // 2. Criar Etapas Padrão
        const stages = [
            { name: 'Disparado', color: '#3B82F6' }, // Blue
            { name: 'Respondeu', color: '#EAB308' }, // Yellow
            { name: 'Negociando', color: '#F97316' }, // Orange
            { name: 'Vendeu', color: '#22C55E' }     // Green
        ];

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

module.exports = router;

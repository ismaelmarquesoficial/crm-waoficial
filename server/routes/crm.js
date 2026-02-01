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

        const query = `
      SELECT c.* 
      FROM contacts c
      JOIN pipeline_stages ps ON c.current_stage_id = ps.id
      WHERE ps.pipeline_id = $1 AND c.tenant_id = $2
    `;

        const result = await db.query(query, [pipelineId, tenantId]);

        console.log(`Buscando cards para Pipeline ${pipelineId}, Tenant ${tenantId}. Encontrados: ${result.rows.length}`);

        res.json(result.rows);

    } catch (err) {
        console.error('Erro ao buscar cards:', err);
        res.status(500).json({ error: 'Erro ao buscar cards' });
    }
});

module.exports = router;

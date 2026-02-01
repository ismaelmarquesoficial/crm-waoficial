const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const verifyToken = require('../middleware/authMiddleware');
const verifySuperAdmin = require('../middleware/adminMiddleware');

// Apply middlewares to all routes here
router.use(verifyToken);
router.use(verifySuperAdmin);

// === TENANTS ===

// List all tenants
router.get('/tenants', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM tenants ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar tenants' });
    }
});

// Create Tenant
router.post('/tenants', async (req, res) => {
    const { name, plan_status } = req.body;

    try {
        await db.query('BEGIN');

        // 1. Create Tenant
        const tenantResult = await db.query(
            'INSERT INTO tenants (name, plan_status, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *',
            [name, plan_status || 'active']
        );
        const newTenant = tenantResult.rows[0];

        // 2. Create Default Pipeline
        const pipelineResult = await db.query(
            "INSERT INTO pipelines (tenant_id, name, created_at) VALUES ($1, 'Funil de Vendas', NOW()) RETURNING id",
            [newTenant.id]
        );
        const pipelineId = pipelineResult.rows[0].id;

        // 3. Create Default Stages
        const defaultStages = [
            { name: 'Novo Lead', color: 'bg-indigo-500', idx: 0 },
            { name: 'Qualificação', color: 'bg-blue-500', idx: 1 },
            { name: 'Proposta', color: 'bg-amber-500', idx: 2 },
            { name: 'Negociação', color: 'bg-purple-500', idx: 3 },
            { name: 'Fechado', color: 'bg-emerald-500', idx: 4 }
        ];

        for (const stage of defaultStages) {
            await db.query(
                "INSERT INTO pipeline_stages (pipeline_id, name, order_index, color) VALUES ($1, $2, $3, $4)",
                [pipelineId, stage.name, stage.idx, stage.color]
            );
        }

        await db.query('COMMIT');

        res.status(201).json(newTenant);

    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar tenant' });
    }
});

// Delete Tenant
router.delete('/tenants/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Warning: This should probably cascade delete users/pipelines/contacts etc.
        // For now, we rely on DB constraints or manual deletion.
        await db.query('DELETE FROM tenants WHERE id = $1', [id]);
        res.json({ message: 'Tenant excluído com sucesso' });
    } catch (err) {
        console.error(err);
        // Handle FK constraints error
        if (err.code === '23503') {
            return res.status(400).json({ error: 'Não é possível excluir: existem dados vinculados a este tenant.' });
        }
        res.status(500).json({ error: 'Erro ao excluir tenant' });
    }
});

// === USERS ===

// List all users
router.get('/users', async (req, res) => {
    try {
        // Join with tenants to show tenant name
        const query = `
            SELECT u.id, u.name, u.email, u.role, u.created_at, t.name as tenant_name 
            FROM users u 
            LEFT JOIN tenants t ON u.tenant_id = t.id
            ORDER BY u.created_at DESC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar usuários' });
    }
});

// Create User
router.post('/users', async (req, res) => {
    const { name, email, password, role, tenantId } = req.body;

    if (!email || !password || !tenantId) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }

    try {
        // Check if exists
        const check = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query(
            'INSERT INTO users (tenant_id, name, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, name, email, role',
            [tenantId, name, email, hashedPassword, role || 'user']
        );

        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
});

// Delete User
router.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'Usuário excluído com sucesso' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir usuário' });
    }
});

module.exports = router;

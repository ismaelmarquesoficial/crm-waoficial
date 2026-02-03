const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

// === PERFIL DA EMPRESA ===

// Obter dados do Tenant atual
router.get('/company', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, name, plan_status, company_name, cnpj, contact_phone, contact_email, address, website, plan_type, plan_limits FROM tenants WHERE id = $1',
            [req.tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tenant não encontrado' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar dados da empresa.' });
    }
});

// Atualizar dados do Tenant
router.put('/company', async (req, res) => {
    const { company_name, cnpj, contact_phone, contact_email, address, website } = req.body;

    try {
        const result = await db.query(
            `UPDATE tenants 
             SET company_name = $1, cnpj = $2, contact_phone = $3, contact_email = $4, address = $5, website = $6, updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [company_name, cnpj, contact_phone, contact_email, address, website, req.tenantId]
        );

        res.json({ message: 'Dados atualizados com sucesso!', tenant: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar dados da empresa.' });
    }
});

// === GESTÃO DE EQUIPE (TEAM) ===

// Listar membros da equipe
router.get('/team', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, name, email, role, avatar, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at DESC',
            [req.tenantId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar equipe.' });
    }
});

// Adicionar novo membro (Convite simplificado)
router.post('/team', async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
    }

    try {
        // Verificar limite do plano (Opcional por enquanto)
        // const tenant = await db.query('SELECT plan_limits FROM tenants WHERE id = $1', [req.tenantId]);
        // const currentUsers = await db.query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [req.tenantId]);
        // ... logica de limite ...

        // Verificar se email já existe
        const check = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: 'Este email já está em uso.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await db.query(
            `INSERT INTO users (tenant_id, name, email, password_hash, role, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING id, name, email, role, created_at`,
            [req.tenantId, name, email, hashedPassword, role || 'agent']
        );

        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao adicionar membro.' });
    }
});

// Remover membro
router.delete('/team/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Impedir auto-exclusão (segurança básica)
        if (id == req.userId) { // req.userId vem do middleware auth
            return res.status(400).json({ error: 'Você não pode excluir sua própria conta aqui.' });
        }

        const result = await db.query(
            'DELETE FROM users WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [id, req.tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        res.json({ message: 'Membro removido com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao remover membro.' });
    }
});

module.exports = router;

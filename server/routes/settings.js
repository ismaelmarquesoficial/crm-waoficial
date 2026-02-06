const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

// === PERFIL DA EMPRESA ===

// Obter dados do Tenant atual
// Obter dados do Tenant atual
router.get('/company', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, name, plan_status, company_name, cnpj, contact_phone, contact_email, address, website, pix_key, custom_variables, plan_type, plan_limits FROM tenants WHERE id = $1',
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
    const { company_name, cnpj, contact_phone, contact_email, address, website, pix_key } = req.body;

    try {
        const result = await db.query(
            `UPDATE tenants 
             SET company_name = $1, cnpj = $2, contact_phone = $3, contact_email = $4, address = $5, website = $6, pix_key = $7, updated_at = NOW()
             WHERE id = $8
             RETURNING *`,
            [company_name, cnpj, contact_phone, contact_email, address, website, pix_key || null, req.tenantId]
        );

        res.json({ message: 'Dados atualizados com sucesso!', tenant: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar dados da empresa.' });
    }
});

// === GESTÃO DE VARIÁVEIS ===

// Adicionar/Atualizar Variável Customizada
router.post('/variables', async (req, res) => {
    const { key, value } = req.body;
    if (!key || !value) return res.status(400).json({ error: 'Chave e valor são obrigatórios.' });

    // Normalizar chave (sem espaços, lowercase)
    const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');

    try {
        // Buscar variáveis atuais
        const currentRes = await db.query('SELECT custom_variables FROM tenants WHERE id = $1', [req.tenantId]);
        let vars = currentRes.rows[0]?.custom_variables || [];

        // Se vars for null (por algum motivo), inicializar
        if (!Array.isArray(vars)) vars = [];

        // Verificar se já existe e atualizar
        const existingIndex = vars.findIndex(v => v.key === normalizedKey);
        if (existingIndex >= 0) {
            vars[existingIndex].value = value;
        } else {
            vars.push({ key: normalizedKey, value });
        }

        // Salvar
        await db.query('UPDATE tenants SET custom_variables = $1 WHERE id = $2', [JSON.stringify(vars), req.tenantId]);

        res.json(vars);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao salvar variável.' });
    }
});

// Remover Variável
router.delete('/variables/:key', async (req, res) => {
    const { key } = req.params;

    try {
        const currentRes = await db.query('SELECT custom_variables FROM tenants WHERE id = $1', [req.tenantId]);
        let vars = currentRes.rows[0]?.custom_variables || [];

        if (!Array.isArray(vars)) vars = [];

        const newVars = vars.filter(v => v.key !== key);

        await db.query('UPDATE tenants SET custom_variables = $1 WHERE id = $2', [JSON.stringify(newVars), req.tenantId]);

        res.json(newVars);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao remover variável.' });
    }
});

// === GESTÃO DE EQUIPE (TEAM) ===

// Listar membros da equipe
router.get('/team', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, name, email, role, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at DESC',
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

// === GESTÃO DE RESPOSTAS RÁPIDAS (QUICK REPLIES) ===

// Listar todas as respostas rápidas do tenant
router.get('/quick-replies', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, shortcut, message, created_at, updated_at FROM quick_replies WHERE tenant_id = $1 ORDER BY shortcut ASC',
            [req.tenantId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar respostas rápidas.' });
    }
});

// Criar nova resposta rápida
router.post('/quick-replies', async (req, res) => {
    const { shortcut, message } = req.body;

    if (!shortcut || !message) {
        return res.status(400).json({ error: 'Atalho e mensagem são obrigatórios.' });
    }

    // Normalizar shortcut (remover espaços, lowercase)
    const normalizedShortcut = shortcut.toLowerCase().trim().replace(/\s+/g, '_');

    try {
        const result = await db.query(
            `INSERT INTO quick_replies (tenant_id, shortcut, message, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())
             RETURNING *`,
            [req.tenantId, normalizedShortcut, message]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Este atalho já existe.' });
        }
        console.error(err);
        res.status(500).json({ error: 'Erro ao criar resposta rápida.' });
    }
});

// Atualizar resposta rápida
router.put('/quick-replies/:id', async (req, res) => {
    const { id } = req.params;
    const { shortcut, message } = req.body;

    if (!shortcut || !message) {
        return res.status(400).json({ error: 'Atalho e mensagem são obrigatórios.' });
    }

    const normalizedShortcut = shortcut.toLowerCase().trim().replace(/\s+/g, '_');

    try {
        const result = await db.query(
            `UPDATE quick_replies 
             SET shortcut = $1, message = $2, updated_at = NOW()
             WHERE id = $3 AND tenant_id = $4
             RETURNING *`,
            [normalizedShortcut, message, id, req.tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Resposta rápida não encontrada.' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Este atalho já existe.' });
        }
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar resposta rápida.' });
    }
});

// Deletar resposta rápida
router.delete('/quick-replies/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            'DELETE FROM quick_replies WHERE id = $1 AND tenant_id = $2 RETURNING id',
            [id, req.tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Resposta rápida não encontrada.' });
        }

        res.json({ message: 'Resposta rápida removida com sucesso.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao remover resposta rápida.' });
    }
});

module.exports = router;

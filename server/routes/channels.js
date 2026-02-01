const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

// Listar todos os canais conectados
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            "SELECT id, instance_name, provider, phone_number_id, status, created_at FROM whatsapp_accounts WHERE tenant_id = $1 ORDER BY created_at DESC",
            [req.tenantId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar canais.' });
    }
});

// Buscar detalhes de uma conexão específica (para edição)
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            "SELECT * FROM whatsapp_accounts WHERE id = $1 AND tenant_id = $2",
            [id, req.tenantId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Conta não encontrada.' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao buscar detalhes da conta.' });
    }
});

// Salvar (Criar ou Atualizar) Conexão Oficial
router.post('/whatsapp-official', async (req, res) => {
    const {
        id, // Se vier ID, é edição
        instanceName,
        appId,
        appSecret,
        phoneNumberId,
        wabaId,
        permanentToken
    } = req.body;

    if (!instanceName || !appId || !phoneNumberId || !permanentToken) {
        return res.status(400).json({ error: 'Campos obrigatórios faltando.' });
    }

    try {
        if (id) {
            // Edição: Verificar se pertence ao tenant
            const check = await db.query("SELECT id FROM whatsapp_accounts WHERE id = $1 AND tenant_id = $2", [id, req.tenantId]);
            if (check.rows.length === 0) return res.status(403).json({ error: 'Acesso negado.' });

            await db.query(
                `UPDATE whatsapp_accounts 
                 SET instance_name = $1, app_id = $2, app_secret = $3, phone_number_id = $4, waba_id = $5, permanent_token = $6, updated_at = NOW()
                 WHERE id = $7`,
                [instanceName, appId, appSecret, phoneNumberId, wabaId, permanentToken, id]
            );
            res.json({ message: 'Conexão atualizada com sucesso.' });
        } else {
            // Criação
            const inserted = await db.query(
                `INSERT INTO whatsapp_accounts 
                 (tenant_id, provider, instance_name, app_id, app_secret, phone_number_id, waba_id, permanent_token, status, created_at, updated_at)
                 VALUES ($1, 'official', $2, $3, $4, $5, $6, $7, 'CONNECTED', NOW(), NOW())
                 RETURNING id`,
                [req.tenantId, instanceName, appId, appSecret, phoneNumberId, wabaId, permanentToken]
            );
            res.status(201).json({ message: 'Nova conexão criada.', id: inserted.rows[0].id });
        }
    } catch (err) {
        console.error('Erro ao salvar canal:', err);
        res.status(500).json({ error: 'Erro ao salvar canal.' });
    }
});

// Excluir Conexão
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query("DELETE FROM whatsapp_accounts WHERE id = $1 AND tenant_id = $2 RETURNING id", [id, req.tenantId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Conta não encontrada.' });
        }

        res.json({ message: 'Conexão removida.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao excluir canal.' });
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db');
const axios = require('axios'); // Needed for Graph API validation
const verifyToken = require('../middleware/authMiddleware');

router.use(verifyToken);

// Listar todos os canais conectados
router.get('/', async (req, res) => {
    try {
        const result = await db.query(
            "SELECT id, instance_name, provider, phone_number_id, status, quality_rating, display_phone_number, verified_name, created_at FROM whatsapp_accounts WHERE tenant_id = $1 ORDER BY created_at DESC",
            [req.tenantId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar canais.' });
    }
});

// Listar TODOS os templates do Tenant
router.get('/templates/all', async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM whatsapp_templates WHERE tenant_id = $1 ORDER BY name ASC",
            [req.tenantId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar templates.' });
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

// Salvar (Criar ou Atualizar) Conexão Oficial com VALIDAÇÃO IMEDIATA e CONSULTA DE STATUS
router.post('/whatsapp-official', async (req, res) => {
    const {
        id,
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

    // PASSO 1: Validação Imediata e Consulta de Status (Sync)
    let finalStatus = 'PENDING';
    let qualityRating = null;
    let displayPhone = null;
    let verifiedName = null;

    try {
        console.log(`🔍 Validando e consultando status na Meta para PhoneID: ${phoneNumberId}...`);

        // Chamada Oficial para pegar Status, Qualidade e Nome
        const metaResponse = await axios.get(`https://graph.facebook.com/v19.0/${phoneNumberId}?fields=status,quality_rating,display_phone_number,verified_name`, {
            headers: { Authorization: `Bearer ${permanentToken}` }
        });

        const metaData = metaResponse.data;
        console.log('✅ Resposta da Meta:', metaData);

        // O status "real" da Meta diz respeito à linha telefônica, mas não à nossa integração (Webhook).
        // Por isso, vamos iniciar como 'PENDING' e esperar o primeiro webhook confirmar a conexão.
        finalStatus = 'PENDING';
        qualityRating = metaData.quality_rating;
        displayPhone = metaData.display_phone_number;
        verifiedName = metaData.verified_name;

    } catch (validationErr) {
        console.error('❌ Erro na validação com a Meta:', validationErr.response?.data || validationErr.message);

        const errorMessage = validationErr.response?.data?.error?.message || 'Token inválido ou Phone ID incorreto.';

        return res.status(400).json({
            error: 'Validação Falhou: ' + errorMessage,
            details: validationErr.response?.data
        });
    }

    // Status inicial sempre PENDING até o webhook confirmar
    const newStatus = finalStatus;

    try {
        if (id) {
            // Edição
            const check = await db.query("SELECT id, status FROM whatsapp_accounts WHERE id = $1 AND tenant_id = $2", [id, req.tenantId]);
            if (check.rows.length === 0) return res.status(403).json({ error: 'Acesso negado.' });

            await db.query(
                `UPDATE whatsapp_accounts 
                 SET instance_name = $1, app_id = $2, app_secret = $3, phone_number_id = $4, waba_id = $5, permanent_token = $6, status = $7, quality_rating = $8, display_phone_number = $9, verified_name = $10, last_error = NULL, updated_at = NOW()
                 WHERE id = $11`,
                [instanceName, appId, appSecret, phoneNumberId, wabaId, permanentToken, newStatus, qualityRating, displayPhone, verifiedName, id]
            );
            res.json({ message: 'Conexão salva! Aguardando primeiro evento do Webhook.', status: newStatus });
        } else {
            // Criação
            const inserted = await db.query(
                `INSERT INTO whatsapp_accounts 
                 (tenant_id, provider, instance_name, app_id, app_secret, phone_number_id, waba_id, permanent_token, status, quality_rating, display_phone_number, verified_name, last_error, created_at, updated_at)
                 VALUES ($1, 'official', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, NOW(), NOW())
                 RETURNING id`,
                [req.tenantId, instanceName, appId, appSecret, phoneNumberId, wabaId, permanentToken, newStatus, qualityRating, displayPhone, verifiedName]
            );
            res.status(201).json({ message: 'Conexão criada! Teste o envio de mensagem para confirmar.', id: inserted.rows[0].id, status: newStatus });
        }
    } catch (err) {
        console.error('Erro ao salvar canal:', err);
        res.status(500).json({ error: 'Erro ao salvar canal no banco.' });
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

// Testar Conexão (Ping/Pong)
router.post('/:id/test-connection', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query("SELECT * FROM whatsapp_accounts WHERE id = $1 AND tenant_id = $2", [id, req.tenantId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Conta não encontrada.' });

        const channel = result.rows[0];
        let targetPhone = channel.display_phone_number ? channel.display_phone_number.replace(/\D/g, '') : null;

        // Fallback: Se não tiver o número no banco, busca na Meta AGORA
        if (!targetPhone) {
            console.log('⚠️ Número não encontrado no BD. Buscando na Meta...');
            try {
                const metaRes = await axios.get(`https://graph.facebook.com/v19.0/${channel.phone_number_id}?fields=display_phone_number,verified_name,quality_rating`, {
                    headers: { Authorization: `Bearer ${channel.permanent_token}` }
                });
                const metaData = metaRes.data;
                if (metaData.display_phone_number) {
                    targetPhone = metaData.display_phone_number.replace(/\D/g, '');
                    await db.query(
                        "UPDATE whatsapp_accounts SET display_phone_number = $1, verified_name = $2, quality_rating = $3 WHERE id = $4",
                        [metaData.display_phone_number, metaData.verified_name, metaData.quality_rating, id]
                    );
                }
            } catch (fetchErr) {
                console.error('Erro ao buscar dados na Meta para o teste:', fetchErr.message);
            }
        }

        if (!targetPhone) {
            return res.status(400).json({ error: 'Número de telefone não identificado para teste. Salve a conexão novamente para buscar os dados.' });
        }

        console.log(`📡 Enviando Ping para ${targetPhone} via ID ${channel.phone_number_id}...`);

        const payload = {
            messaging_product: 'whatsapp', recipient_type: 'individual', to: String(targetPhone), type: 'text',
            text: { body: `🔔 Teste de Conexão CRM - ${new Date().toLocaleTimeString()}` }
        };

        await axios.post(`https://graph.facebook.com/v21.0/${channel.phone_number_id}/messages`, payload, {
            headers: { Authorization: `Bearer ${channel.permanent_token}`, 'Content-Type': 'application/json' }
        });

        res.json({ message: 'Ping enviado! Aguardando retorno do Webhook.' });

    } catch (err) {
        console.error('Erro no teste de conexão (Detalhes):', JSON.stringify(err.response?.data || err.message, null, 2));
        res.status(500).json({ error: `Falha na Meta: ${err.message}`, details: err.response?.data });
    }
});

// Atualizar Status Manualmente
router.patch('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['PENDING', 'CONNECTED', 'VERIFIED'].includes(status)) return res.status(400).json({ error: 'Status inválido.' });
    try {
        await db.query("UPDATE whatsapp_accounts SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3", [status, id, req.tenantId]);
        res.json({ message: 'Status atualizado.', status });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao atualizar status.' });
    }
});

// Sincronizar Templates de TODAS as contas do Tenant (Bulk Sync - Padrão Enterprise)
router.post('/sync-all-templates', async (req, res) => {
    console.log(`[SYNC] Iniciando Syn para Tenant ID: ${req.tenantId}`);
    try {
        // 1. Buscar contas ativas do tenant
        const accounts = await db.query(
            "SELECT id, waba_id, permanent_token, instance_name FROM whatsapp_accounts WHERE tenant_id = $1",
            [req.tenantId]
        );

        console.log(`[SYNC] Contas encontradas no banco: ${accounts.rows.length}`);

        if (accounts.rows.length === 0) {
            return res.json({ message: 'Nenhuma conta conectada para sincronizar.', count: 0 });
        }

        let syncedTotal = 0;
        let accountsSuccess = 0;
        let accountsFailed = 0;
        const errorsDetail = [];

        for (const channel of accounts.rows) {
            if (!channel.waba_id || !channel.permanent_token) {
                console.warn(`[SYNC] ⚠️ Conta ${channel.id} ignorada: Sem WABA ID ou Token.`);
                continue;
            }

            try {
                console.log(`[SYNC] 📥 Baixando de: ${channel.instance_name || channel.waba_id}`);
                const url = `https://graph.facebook.com/v21.0/${channel.waba_id}/message_templates?limit=100`;
                const metaRes = await axios.get(url, { headers: { Authorization: `Bearer ${channel.permanent_token}` } });
                const templates = metaRes.data.data;
                console.log(`[SYNC] Recebidos: ${templates.length} templates.`);

                if (templates.length > 0) {
                    for (const tpl of templates) {
                        // 1. Contagem (Blueprint Count)
                        const countVars = (txt) => {
                            if (!txt) return 0;
                            const matches = txt.match(/\{\{(.*?)\}\}/g);
                            if (!matches) return 0;
                            const isPositional = matches.some(m => /^\{\{\s*\d+\s*\}\}$/.test(m));
                            if (isPositional) {
                                return new Set(matches.map(m => m.replace(/\D/g, ''))).size;
                            } else {
                                return matches.length;
                            }
                        };

                        // 2. Extração de Nomes (Blueprint Names)
                        const extractNames = (txt) => {
                            if (!txt) return null;
                            const matches = txt.match(/\{\{(.*?)\}\}/g);
                            if (!matches) return null;
                            return matches.map(m => m.replace(/[\{\}]/g, '').trim());
                        };

                        let hVars = 0, bVars = 0;
                        let hNames = null, bNames = null;

                        if (Array.isArray(tpl.components)) {
                            const hComp = tpl.components.find(c => c.type === 'HEADER' && c.format === 'TEXT');
                            if (hComp && hComp.text) {
                                hVars = countVars(hComp.text);
                                hNames = extractNames(hComp.text);
                            }

                            const bComp = tpl.components.find(c => c.type === 'BODY');
                            if (bComp && bComp.text) {
                                bVars = countVars(bComp.text);
                                bNames = extractNames(bComp.text);
                            }
                        }

                        await db.query(`
                            INSERT INTO whatsapp_templates 
                            (tenant_id, account_id, waba_id, meta_id, name, language, status, category, components, last_synced_at, header_vars_count, body_vars_count, header_var_names, body_var_names)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12, $13)
                            ON CONFLICT (waba_id, name, language) 
                            DO UPDATE SET 
                                status = EXCLUDED.status, category = EXCLUDED.category, components = EXCLUDED.components,
                                meta_id = EXCLUDED.meta_id, last_synced_at = NOW(),
                                header_vars_count = EXCLUDED.header_vars_count,
                                body_vars_count = EXCLUDED.body_vars_count,
                                header_var_names = EXCLUDED.header_var_names,
                                body_var_names = EXCLUDED.body_var_names;
                        `, [req.tenantId, channel.id, channel.waba_id, tpl.id, tpl.name, tpl.language, tpl.status, tpl.category, JSON.stringify(tpl.components), hVars, bVars, hNames, bNames]);
                        syncedTotal++;
                    }
                    accountsSuccess++;
                }
            } catch (e) {
                console.error(`[SYNC] ❌ Falha conta ${channel.id}:`, e.response?.data || e.message);
                accountsFailed++;
                errorsDetail.push(`Conta ${channel.instance_name || channel.waba_id}: ${e.response?.data?.error?.message || e.message}`);
            }
        }

        console.log(`[SYNC] ✅ Finalizado. Sucesso: ${accountsSuccess}, Falhas: ${accountsFailed}`);
        res.json({
            message: 'Sincronização concluída.',
            stats: {
                accounts_processed: accounts.rows.length,
                accounts_success: accountsSuccess,
                accounts_failed: accountsFailed,
                total_templates: syncedTotal
            },
            errors: errorsDetail
        });
    } catch (err) {
        console.error('[SYNC] 🔥 Erro CRÍTICO:', err);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// Listar Templates de um Canal
router.get('/:id/templates', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query("SELECT * FROM whatsapp_templates WHERE account_id = $1 AND tenant_id = $2 ORDER BY name ASC", [id, req.tenantId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao listar templates.' });
    }
});

// Sincronizar Templates da Meta (Rota Legacy/Individual)
router.post('/:id/sync-templates', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query("SELECT * FROM whatsapp_accounts WHERE id = $1 AND tenant_id = $2", [id, req.tenantId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Conta não encontrada.' });
        // ... (Mesma lógica legada, mantida por compatibilidade se necessário, mas simplificada aqui)
        res.json({ message: 'Use a rota /sync-all-templates para melhor desempenho.' });
    } catch (err) {
        res.status(500).json({ error: 'Rota depreciada.' });
    }
});

module.exports = router;

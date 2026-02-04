const express = require('express');
const router = express.Router();
const db = require('../../db');
const WhatsAppService = require('./service');

// 1. O TOKEN QUE VOCÊ COLOCOU NO PAINEL DA META
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'talke_ia_master_secure_2024';

// ROTA CENTRALIZADA
router.route('/') // O prefixo /api/webhooks/whatsapp já está no index.js
    // --- PARTE 1: VALIDAÇÃO (O que a Meta pede ao configurar) ---
    .get(async (req, res) => {
        console.log('🔔 Webhook VERIFY (GET) recebido!');
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        const io = req.app.get('io'); // Get IO instance

        // Tenta notificar início
        const initialMatch = token ? token.match(/^talke_tenant_(\d+)$/) : null;
        if (initialMatch && io) {
            io.to(`tenant_${initialMatch[1]}`).emit('webhook_log', { message: '🔔 Webhook VERIFY (GET) recebido!' });
        }

        console.log('👉 Dados recebidos:', { mode, token, challenge });

        if (mode === 'subscribe') {
            let isValid = false;
            let targetTenantId = null;

            // 1. Validação de Token Dinâmico (Tenant Específico)
            const tenantMatch = token ? token.match(/^talke_tenant_(\d+)$/) : null;

            if (tenantMatch) {
                isValid = true;
                targetTenantId = tenantMatch[1];
                console.log(`🔍 Token Válido para Tenant ID: ${targetTenantId}`);
                if (io) io.to(`tenant_${targetTenantId}`).emit('webhook_log', { message: `🔍 Token Válido para Tenant ID: ${targetTenantId}` });
            }
            // 2. Validação de Token Global (Legado/Admin)
            else if (token === VERIFY_TOKEN) {
                isValid = true;
                console.log('🔍 Token Global Válido.');
            }

            if (isValid) {
                console.log('✅ WEBHOOK_VALIDADO.');
                if (io && targetTenantId) io.to(`tenant_${targetTenantId}`).emit('webhook_log', { message: '✅ WEBHOOK VALIDADO COM SUCESSO! Conexão Confirmada.' });

                // ATUALIZAÇÃO INTELIGENTE DE STATUS
                try {
                    let updateResult;
                    if (targetTenantId) {
                        // Ativa apenas contas deste Tenant (Status intermediário VERIFIED)
                        updateResult = await db.query(
                            "UPDATE whatsapp_accounts SET status = 'VERIFIED', updated_at = NOW() WHERE tenant_id = $1 AND (status = 'PENDING' OR status = 'API_CONNECTED') RETURNING id",
                            [targetTenantId]
                        );

                        // Notificar Frontend (Socket.IO)
                        const io = req.app.get('io');
                        if (io && updateResult.rows.length > 0) {
                            updateResult.rows.forEach(row => {
                                console.log(`📡 Emitindo status VERIFIED para canal ${row.id}`);
                                io.to(`tenant_${targetTenantId}`).emit('channel_status_update', { id: row.id, status: 'VERIFIED' });
                            });
                        }

                        console.log(`📡 Status VERIFIED definido para tenant ${targetTenantId}`);

                    } else {
                        // Token Global
                        updateResult = await db.query(
                            "UPDATE whatsapp_accounts SET status = 'VERIFIED', updated_at = NOW() WHERE status = 'PENDING'"
                        );
                    }

                    if (updateResult.rowCount > 0) {
                        console.log(`🔗 ${updateResult.rowCount} conta(s) marcadas como VERIFIED (Assinatura OK).`);
                    }
                } catch (err) {
                    console.error('Erro ao ativar contas via GET verify:', err);
                }

                return res.status(200).send(challenge);
            }
        }

        console.error('❌ Falha na verificação do token (Token incorreto ou ausente).');
        return res.sendStatus(403);
    })

    // --- PARTE 2: RECEBIMENTO (Onde chegam as mensagens reais) ---
    .post(async (req, res) => {
        console.log('📨 Webhook EVENT (POST) recebido!');
        const body = req.body;
        const io = req.app.get('io');

        console.log('📦 Payload JSON da Meta:', JSON.stringify(body, null, 2));

        if (body.object === 'whatsapp_business_account') {
            res.sendStatus(200);

            try {
                if (!body.entry || body.entry.length === 0) {
                    console.log('⚠️ Payload sem "entry"');
                    return;
                }

                const entry = body.entry[0];
                if (!entry.changes || entry.changes.length === 0) {
                    console.log('⚠️ Payload sem "changes"');
                    return;
                }

                const change = entry.changes[0];
                const value = change.value;

                if (!value || !value.metadata) {
                    console.log('⚠️ Payload sem "metadata" (pode ser status de conta ou outro evento)');
                    return;
                }

                const phoneNumberId = value.metadata.phone_number_id;
                console.log(`🔑 ID do Telefone no Evento: ${phoneNumberId}`);

                // 1. Busca no banco o Tenant dono deste número
                const accountResult = await db.query(
                    "SELECT id, tenant_id, status FROM whatsapp_accounts WHERE phone_number_id = $1",
                    [phoneNumberId]
                );

                if (accountResult.rows.length === 0) {
                    console.warn(`⚠️ Recebida mensagem para número não cadastrado: ${phoneNumberId}`);
                    return;
                }

                const { id: accountId, tenant_id: tenantId, status } = accountResult.rows[0];
                console.log(`🏢 Tenant encontrado: ${tenantId} | Status Atual: ${status}`);

                // "PULO DO GATO": Validação em Tempo Real
                // Se a conta não estava conectada e recebeu mensagem, marca como conectada!
                if (status !== 'CONNECTED' && status !== 'connected') {
                    await db.query("UPDATE whatsapp_accounts SET status = 'CONNECTED', updated_at = NOW() WHERE id = $1", [accountId]);
                    console.log(`🟢 Status da Conta ${accountId} atualizado para CONNECTED!`);

                    // Notificar Frontend para mudar a bolinha para VERDE sem refresh
                    if (io) {
                        io.to(`tenant_${tenantId}`).emit('channel_status_update', {
                            id: accountId,
                            status: 'CONNECTED'
                        });
                    }
                }

                // 3. Processar Mensagens
                if (value.messages && value.messages.length > 0) {
                    const message = value.messages[0];
                    console.log(`💬 Processando mensagem de: ${message.from}`);

                    // --- DETECÇÃO DE TESTE DE CONEXÃO ---
                    if (message.type === 'text' && message.text && message.text.body && message.text.body.includes('Teste de Conexão CRM')) {
                        console.log('🧪 PONG! Recebido retorno do teste de conexão via Webhook.');
                        if (io) {
                            io.to(`tenant_${tenantId}`).emit('connection_test_success', {
                                channelId: accountId,
                                timestamp: Date.now()
                            });
                        }
                        return res.sendStatus(200); // Para por aqui, não precisa salvar no banco
                    }
                    // -------------------------------------

                    const contactInfo = value.contacts ? value.contacts[0] : null;

                    const contactPhone = message.from;
                    const contactName = contactInfo?.profile?.name || contactPhone;

                    // A. Achar ou Criar Contato
                    const contactId = await WhatsAppService.findOrCreateContact(tenantId, contactPhone, contactName);

                    // B. Salvar Mensagem
                    const savedMessage = await WhatsAppService.saveMessage(tenantId, contactId, accountId, message);

                    console.log(`✅ Mensagem salva no banco! ID: ${savedMessage.id}`);

                    // C. Notificar Frontend (Socket.io)
                    if (io) {
                        io.to(`tenant_${tenantId}`).emit('new_message', {
                            contactId: contactId,
                            message: savedMessage
                        });
                        console.log(`📡 Evento 'new_message' disparado via Socket!`);
                    }
                } else {
                    console.log('ℹ️ O evento não contém mensagens de texto (pode ser status de entrega: sent/delivered/read).');
                }

            } catch (err) {
                console.error('❌ Erro no processamento do evento:', err);
                // Não enviamos erro 500 para a Meta pois já enviamos 200 no início.
            }
        } else {
            console.log('❓ Evento desconhecido (não é whatsapp_business_account).');
            res.sendStatus(404);
        }
    });

module.exports = router;

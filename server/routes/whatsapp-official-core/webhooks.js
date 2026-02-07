const express = require('express');
const router = express.Router();
const db = require('../../db');
const WebhookProcessor = require('../../services/whatsapp-oficial/Webhooks/WebhookProcessor');

/**
 * CORE WHATSAPP OFICIAL - Webhooks
 * Responsável por receber mensagens, mídias e status da Meta
 */

// Validação do Webhook (GET)
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Em produção, valide o verify_token contra seu .env
    if (mode === 'subscribe') {
        console.log('[CORE OFICIAL - WEBHOOK] 🔔 Webhook validado com sucesso.');
        return res.status(200).send(challenge);
    }
    res.sendStatus(403);
});

// Processamento de Eventos (POST)
router.post('/', async (req, res) => {
    const body = req.body;
    const io = req.app.get('io');

    if (body.object === 'whatsapp_business_account') {
        // Ack imediato para a Meta
        res.sendStatus(200);

        try {
            const entry = body.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;
            const message = value?.messages?.[0];

            if (message) {
                const phoneNumberId = value.metadata.phone_number_id;

                // Identificar a quem pertence este evento
                const accRes = await db.query(
                    "SELECT id, tenant_id, permanent_token FROM whatsapp_accounts WHERE phone_number_id = $1",
                    [phoneNumberId]
                );

                if (accRes.rowCount > 0) {
                    const { id: accountId, tenant_id: tenantId, permanent_token: token } = accRes.rows[0];

                    // Encaminha para o Orquestrador do Core Oficial
                    console.log(`[CORE OFICIAL - WEBHOOK] 📥 Nova mensagem recebida (Tipo: ${message.type})`);
                    await WebhookProcessor.process(tenantId, accountId, message, token, io);
                }
            }
        } catch (err) {
            console.error('[CORE OFICIAL - WEBHOOK] ❌ Erro de processamento:', err.message);
        }
    } else {
        res.sendStatus(404);
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../db');
const WebhookProcessor = require('../services/whatsapp-oficial/Webhooks/WebhookProcessor');

/**
 * Rotas dedicadas ao recebimento de eventos da API Oficial (Webhooks V2)
 */

// Validação do Webhook (GET)
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe') {
        return res.status(200).send(challenge);
    }
    res.sendStatus(403);
});

// Processamento de Eventos (POST)
router.post('/', async (req, res) => {
    const body = req.body;
    const io = req.app.get('io');

    if (body.object === 'whatsapp_business_account') {
        res.sendStatus(200);

        try {
            const entry = body.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;
            const message = value?.messages?.[0];

            if (message) {
                const phoneNumberId = value.metadata.phone_number_id;

                const accRes = await db.query(
                    "SELECT id, tenant_id, permanent_token FROM whatsapp_accounts WHERE phone_number_id = $1",
                    [phoneNumberId]
                );

                if (accRes.rows.length > 0) {
                    const { id: accountId, tenant_id: tenantId, permanent_token: token } = accRes.rows[0];

                    // Direciona para o Core Oficial
                    const { type, processedData } = await WebhookProcessor.process(tenantId, accountId, message, token, io);

                    if (type === 'audio' && processedData) {
                        // Lógica individual de salvamento pode ser feita aqui ou no processor
                        console.log(`[Webhook V2] Áudio oficial processado: ${processedData.meta_media_id}`);
                    }
                }
            }
        } catch (err) {
            console.error('Erro no processamento do Webhook Oficial:', err);
        }
    } else {
        res.sendStatus(404);
    }
});

module.exports = router;

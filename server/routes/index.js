const express = require('express');
const router = express.Router();

const messageRoutes = require('./messageRoutes');
const webhookRoutes = require('./webhookRoutes');

/**
 * Centralizador de Rotas da Nova Arquitetura
 */

// Rotas de Mensagens (Envio)
router.use('/messages', messageRoutes);

// Rotas de Webhook (Recebimento)
router.use('/webhooks/whatsapp', webhookRoutes);

module.exports = router;

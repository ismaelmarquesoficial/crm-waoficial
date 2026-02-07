const express = require('express');
const router = express.Router();

const audioRoutes = require('./audio');
const webhookRoutes = require('./webhooks');

/**
 * CENTRALIZADOR DO CORE WHATSAPP OFICIAL
 * Agrupa todas as funcionalidades da API Oficial da Meta.
 */

router.use('/audio', audioRoutes);
router.use('/webhooks', webhookRoutes);

module.exports = router;

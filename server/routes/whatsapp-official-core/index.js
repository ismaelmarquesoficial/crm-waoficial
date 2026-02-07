const express = require('express');
const router = express.Router();

const audioRoutes = require('./audio');
const imageRoutes = require('./images');
const interactiveRoutes = require('./interactive');
const webhookRoutes = require('./webhooks');

/**
 * CENTRALIZADOR DO CORE WHATSAPP OFICIAL
 * Agrupa todas as funcionalidades da API Oficial da Meta.
 */

router.use('/audio', audioRoutes);
router.use('/images', imageRoutes);
router.use('/interactive', interactiveRoutes);
router.use('/webhooks', webhookRoutes);

module.exports = router;

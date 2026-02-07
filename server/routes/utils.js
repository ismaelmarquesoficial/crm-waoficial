const express = require('express');
const router = express.Router();
const metadataFetcher = require('../utils/metadataFetcher');
const verifyToken = require('../middleware/authMiddleware');

/**
 * GET /api/utils/metadata?url=...
 * Busca metadados de uma URL para prévia de links
 */
router.get('/metadata', verifyToken, async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL é obrigatória' });
    }

    const metadata = await metadataFetcher.fetch(url);

    if (!metadata) {
        return res.status(404).json({ error: 'Não foi possível obter metadados para esta URL' });
    }

    res.json(metadata);
});

module.exports = router;

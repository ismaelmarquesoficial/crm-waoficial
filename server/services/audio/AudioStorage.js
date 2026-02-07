const fs = require('fs');
const path = require('path');

/**
 * Serviço responsável por gerenciar o armazenamento físico de arquivos
 */
const AudioStorage = {
    /**
     * Garante a existência da pasta e retorna o caminho para o canal/tenant específico
     * Estrutura: server/storage/tenant_X/channel_Y/
     */
    getStoragePath: (tenantId, channelId) => {
        const baseDir = path.join(__dirname, '..', '..', 'storage');
        const dir = path.join(baseDir, `tenant_${tenantId}`, `channel_${channelId}`);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    },

    /**
     * Retorna o caminho público (URL) para um arquivo salvo
     */
    getPublicUrl: (tenantId, channelId, filename) => {
        return `/files/tenant_${tenantId}/channel_${channelId}/${filename}`;
    }
};

module.exports = AudioStorage;

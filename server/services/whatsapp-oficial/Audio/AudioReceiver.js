const Client = require('../Client');
const AudioConverter = require('../../audio/AudioConverter');
const AudioStorage = require('../../audio/AudioStorage');
const fs = require('fs');
const path = require('path');

/**
 * Orquestrador especializado no recebimento de áudios da API Oficial
 */
const AudioReceiver = {
    /**
     * Executa o fluxo: Buscar URL -> Download Stream -> Converter para MP3
     */
    receive: async (tenantId, accountId, token, audioMetadata) => {
        const metaMediaId = audioMetadata.id;

        // 1. Obtém a URL de download através do Client Oficial
        const downloadUrl = await Client.getMediaUrl(metaMediaId, token);

        // 2. Prepara caminhos de arquivo
        const storageDir = AudioStorage.getStoragePath(tenantId, accountId);
        const fileNameBase = `inbound_oficial_${Date.now()}`;

        const pathOgg = path.join(storageDir, `${fileNameBase}.ogg`);
        const pathMp3 = path.join(storageDir, `${fileNameBase}.mp3`);

        // 3. Realiza o download do stream da Meta
        const writer = fs.createWriteStream(pathOgg);
        const response = await Client.downloadMediaStream(downloadUrl, token);

        await new Promise((resolve, reject) => {
            response.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        // 4. Converte para MP3 para que o CRM consiga tocar no navegador
        await AudioConverter.toMp3(pathOgg, pathMp3);

        return {
            file_path_ogg: AudioStorage.getPublicUrl(tenantId, accountId, `${fileNameBase}.ogg`),
            file_path_mp3: AudioStorage.getPublicUrl(tenantId, accountId, `${fileNameBase}.mp3`),
            meta_media_id: metaMediaId
        };
    }
};

module.exports = AudioReceiver;

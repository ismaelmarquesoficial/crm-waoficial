const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Configurar o caminho do binário do FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Garante que a pasta de destino exista e retorna o caminho.
 * Estrutura: storage/tenant_ID/channel_ID/
 */
function getStoragePath(tenantId, channelId) {
    // Resolve para a raiz do projeto/server (assumindo que este arquivo está em server/utils)
    const baseDir = path.join(__dirname, '..', 'storage');
    const dir = path.join(baseDir, `tenant_${tenantId}`, `channel_${channelId}`);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

/**
 * Converte arquivo de áudio para MP3 (Para o Browser)
 */
function convertAudioToMp3(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .toFormat('mp3')
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
}

/**
 * Converte arquivo de áudio para OGG (Para o WhatsApp/Meta)
 * Importante: Codec libopus é necessário para WhatsApp
 */
function convertAudioToOgg(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioCodec('libopus')
            .toFormat('ogg')
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err))
            .save(outputPath);
    });
}

module.exports = {
    getStoragePath,
    convertAudioToMp3,
    convertAudioToOgg
};

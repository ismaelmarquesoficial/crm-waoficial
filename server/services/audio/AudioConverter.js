const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Configurar o caminho do binário do FFmpeg
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Utilitário neutro para conversão de áudio.
 */
const AudioConverter = {
    /**
     * Converte para OGG/Opus seguindo as recomendações da Meta para WhatsApp Oficial:
     * - Bitrate: 64kbps (ideal para voz)
     * - Canais: 1 (Mono)
     * - Frequência: 48000Hz
     */
    toOgg: (inputPath, outputPath) => {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .audioCodec('libopus')
                .audioBitrate('64k')
                .audioChannels(1)
                .audioFrequency(48000)
                .toFormat('ogg')
                .on('end', () => resolve(outputPath))
                .on('error', (err) => reject(err))
                .save(outputPath);
        });
    },

    /**
     * Converte para MP3 para garantir reprodução em qualquer navegador (CRM)
     */
    toMp3: (inputPath, outputPath) => {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .toFormat('mp3')
                .on('end', () => resolve(outputPath))
                .on('error', (err) => reject(err))
                .save(outputPath);
        });
    }
};

module.exports = AudioConverter;

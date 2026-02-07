const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Configura o caminho do binário do FFmpeg para garantir funcionamento no Windows
ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Serviço responsável por todas as conversões de áudio usando FFmpeg
 */
const AudioConverter = {
    /**
     * Converte um arquivo de áudio para MP3 (ideal para reprodução em navegadores)
     */
    toMp3: (inputPath, outputPath) => {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .toFormat('mp3')
                .on('end', () => resolve(outputPath))
                .on('error', (err) => reject(err))
                .save(outputPath);
        });
    },

    /**
     * Converte um arquivo de áudio para OGG com codec libopus (obrigatorio para WhatsApp)
     */
    toOgg: (inputPath, outputPath) => {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .audioCodec('libopus')
                .toFormat('ogg')
                .on('end', () => resolve(outputPath))
                .on('error', (err) => reject(err))
                .save(outputPath);
        });
    }
};

module.exports = AudioConverter;

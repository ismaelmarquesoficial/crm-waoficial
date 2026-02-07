const Client = require('../Client');
const AudioConverter = require('../../audio/AudioConverter');
const AudioStorage = require('../../audio/AudioStorage');
const path = require('path');

/**
 * Orquestrador especializado no envio de mensagens de Áudio (Oficial)
 */
const AudioSender = {
    /**
     * Executa o fluxo: Converter -> Upload Meta -> Envio Meta
     */
    send: async (tenantId, contactPhone, channel, file, originalPath) => {
        const fileNameBase = `outbound_oficial_${Date.now()}`;
        const storageDir = AudioStorage.getStoragePath(tenantId, channel.id);

        const pathOgg = path.join(storageDir, `${fileNameBase}.ogg`);
        const pathMp3 = path.join(storageDir, `${fileNameBase}.mp3`);

        // 1. Converte para OGG (exigência WhatsApp) e MP3 (exigência Browser)
        await Promise.all([
            AudioConverter.toOgg(originalPath, pathOgg),
            AudioConverter.toMp3(originalPath, pathMp3)
        ]);

        // 2. Upload para os servidores da Meta
        const mediaId = await Client.uploadMedia(
            channel.phone_number_id,
            channel.permanent_token,
            pathOgg,
            'audio/ogg'
        );

        // 3. Monta o JSON específico do WhatsApp Oficial para o envio
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: contactPhone,
            type: "audio",
            audio: { id: mediaId }
        };

        const result = await Client.sendMessage(
            channel.phone_number_id,
            channel.permanent_token,
            payload
        );

        return {
            wamid: result.messages[0].id,
            file_path_ogg: AudioStorage.getPublicUrl(tenantId, channel.id, `${fileNameBase}.ogg`),
            file_path_mp3: AudioStorage.getPublicUrl(tenantId, channel.id, `${fileNameBase}.mp3`),
            mediaId
        };
    }
};

module.exports = AudioSender;

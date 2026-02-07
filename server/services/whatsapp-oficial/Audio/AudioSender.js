const Client = require('../Client');
const AudioConverter = require('../../audio/AudioConverter');
const AudioStorage = require('../../audio/AudioStorage');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../../../db');

/**
 * Orquestrador especializado no envio de mensagens de Áudio (Oficial)
 */
const AudioSender = {
    /**
     * Gera um hash MD5 do arquivo para servir como chave de cache
     */
    getFileHash: (filePath) => {
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(fileBuffer).digest('hex');
    },

    /**
     * Verifica se este áudio (pelo hash) já foi enviado e tem um Media ID válido na Meta
     */
    checkCache: async (tenantId, fileHash) => {
        const result = await db.query(
            `SELECT meta_media_id 
             FROM chat_logs 
             WHERE tenant_id = $1 
               AND file_hash = $2 
               AND meta_media_id IS NOT NULL 
             LIMIT 1`,
            [tenantId, fileHash]
        );
        return result.rows[0]?.meta_media_id || null;
    },

    /**
     * Executa o fluxo: Converter -> [Cache/Upload] -> Envio Meta
     */
    send: async (tenantId, contactPhone, channel, file, originalPath) => {
        console.log(`[AudioSender] Iniciando envio para ${contactPhone} (Tenant: ${tenantId})`);

        const fileNameBase = `outbound_oficial_${Date.now()}`;
        const storageDir = AudioStorage.getStoragePath(tenantId, channel.id);

        const pathOgg = path.join(storageDir, `${fileNameBase}.ogg`);
        const pathMp3 = path.join(storageDir, `${fileNameBase}.mp3`);

        // 1. Conversão
        console.log(`[AudioSender] Convertendo arquivo: ${file.originalname}`);
        await Promise.all([
            AudioConverter.toOgg(originalPath, pathOgg),
            AudioConverter.toMp3(originalPath, pathMp3)
        ]);
        console.log(`[AudioSender] Conversão concluída: .ogg e .mp3 gerados.`);

        // 2. Cache
        const fileHash = AudioSender.getFileHash(pathOgg);
        console.log(`[AudioSender] Hash do arquivo: ${fileHash}`);

        let mediaId = await AudioSender.checkCache(tenantId, fileHash);

        if (mediaId) {
            console.log(`[AudioSender] ♻️ Cache atingido! Reusando Media ID: ${mediaId}`);
        } else {
            console.log(`[AudioSender] 📤 Cache não encontrado. Fazendo upload para Meta v21.0...`);
            mediaId = await Client.uploadMedia(
                channel.phone_number_id,
                channel.permanent_token,
                pathOgg,
                'audio/ogg'
            );
            console.log(`[AudioSender] ✅ Upload concluído. Novo Media ID: ${mediaId}`);
        }

        // 3. Envio
        const cleanPhone = contactPhone.replace(/\D/g, '');
        console.log(`[AudioSender] Enviando mensagem para ${cleanPhone}...`);

        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanPhone,
            type: "audio",
            audio: {
                id: mediaId,
                voice: true // Habilita formato de recado de voz (foto de perfil, ícone de microfone)
            }
        };

        const result = await Client.sendMessage(
            channel.phone_number_id,
            channel.permanent_token,
            payload
        );

        const wamid = result.messages[0].id;
        console.log(`[AudioSender] 🚀 Sucesso! WAMID: ${wamid}`);

        return {
            wamid,
            file_path_ogg: AudioStorage.getPublicUrl(tenantId, channel.id, `${fileNameBase}.ogg`),
            file_path_mp3: AudioStorage.getPublicUrl(tenantId, channel.id, `${fileNameBase}.mp3`),
            mediaId,
            fileHash
        };
    }
};

module.exports = AudioSender;

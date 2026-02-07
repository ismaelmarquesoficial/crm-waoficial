const Client = require('../Client');
const AudioStorage = require('../../audio/AudioStorage'); // Reusando a estrutura de pastas
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../../../db');

/**
 * Orquestrador especializado no envio de IMAGENS (Oficial)
 * Implementa cache via Hash MD5 para evitar uploads repetidos para a Meta.
 */
const ImageSender = {
    /**
     * Gera um hash MD5 do arquivo
     */
    getFileHash: (filePath) => {
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(fileBuffer).digest('hex');
    },

    /**
     * Verifica se esta imagem já foi enviada (Cache)
     */
    checkCache: async (tenantId, fileHash) => {
        const result = await db.query(
            `    SELECT meta_media_id 
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
     * Fluxo: Salvar Local -> [Cache/Upload] -> Enviar Meta
     */
    send: async (tenantId, contactPhone, channel, file, caption) => {
        console.log(`[ImageSender] 📸 Iniciando envio para ${contactPhone}`);

        // 1. Preparar caminhos
        const fileExtension = path.extname(file.originalname) || '.jpg';
        const fileName = `outbound_img_${Date.now()}${fileExtension}`;
        const storageDir = AudioStorage.getStoragePath(tenantId, channel.id);
        const finalPath = path.join(storageDir, fileName);

        // Mover arquivo da temp para storage final
        fs.renameSync(file.path, finalPath);

        // 2. Inteligência: Gerar Hash para Cache
        const fileHash = ImageSender.getFileHash(finalPath);
        console.log(`[ImageSender] Hash: ${fileHash}`);

        let mediaId = await ImageSender.checkCache(tenantId, fileHash);

        if (mediaId) {
            console.log(`[ImageSender] ♻️ Cache atingido! Media ID: ${mediaId}`);
        } else {
            console.log(`[ImageSender] 📤 Uploading para Meta...`);
            mediaId = await Client.uploadMedia(
                channel.phone_number_id,
                channel.permanent_token,
                finalPath,
                file.mimetype || 'image/jpeg'
            );
            console.log(`[ImageSender] ✅ Novo Media ID: ${mediaId}`);
        }

        // 3. Enviar via Meta
        const cleanPhone = contactPhone.replace(/\D/g, '');
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanPhone,
            type: "image",
            image: {
                id: mediaId,
                caption: caption || ""
            }
        };

        const result = await Client.sendMessage(
            channel.phone_number_id,
            channel.permanent_token,
            payload
        );

        return {
            wamid: result.messages[0].id,
            publicUrl: AudioStorage.getPublicUrl(tenantId, channel.id, fileName),
            mediaId,
            fileHash,
            fileName
        };
    }
};

module.exports = ImageSender;

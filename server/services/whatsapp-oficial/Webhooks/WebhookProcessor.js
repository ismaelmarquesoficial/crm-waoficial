const AudioReceiver = require('../Audio/AudioReceiver');

/**
 * Cérebro central do Webhook para WhatsApp Oficial
 * Responsável por distribuir os eventos para os tratamentos individuais.
 */
const WebhookProcessor = {
    /**
     * Identifica o tipo de mensagem e roteia para o serviço especializado
     */
    process: async (tenantId, accountId, message, token, io) => {
        const type = message.type;
        let result = null;

        console.log(`[Core Oficial] Processando tipo: ${type}`);

        switch (type) {
            case 'audio':
                // Tratamento individual para áudio
                result = await AudioReceiver.receive(tenantId, accountId, token, message.audio);
                break;

            case 'text':
                console.log('[Core Oficial] Texto recebido - Handler em breve.');
                break;

            case 'image':
                console.log('[Core Oficial] Imagem recebida - Handler em breve.');
                break;

            default:
                console.log(`[Core Oficial] Handler não implementado para: ${type}`);
        }

        return {
            type,
            processedData: result
        };
    }
};

module.exports = WebhookProcessor;

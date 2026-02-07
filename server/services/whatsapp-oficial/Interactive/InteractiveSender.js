const Client = require('../Client');
const db = require('../../../db');

/**
 * Orquestrador especializado no envio de mensagens Interativas (Botões/Listas)
 */
const InteractiveSender = {
    /**
     * Executa o fluxo de envio para a Meta e retorna o objeto formatado para o banco
     */
    send: async (tenantId, contactPhone, channel, interactiveData) => {
        console.log(`[InteractiveSender] Iniciando envio para ${contactPhone} (Tenant: ${tenantId})`);

        const cleanPhone = contactPhone.replace(/\D/g, '');

        // Monta o payload conforme a API Oficial da Meta
        const payload = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanPhone,
            type: "interactive",
            interactive: interactiveData
        };

        const result = await Client.sendMessage(
            channel.phone_number_id,
            channel.permanent_token,
            payload
        );

        const wamid = result.messages[0].id;
        console.log(`[InteractiveSender] 🚀 Sucesso! WAMID: ${wamid}`);

        // O "Modo de Salvar" solicitado: o objeto inteiro da mensagem enviada
        // Incluímos o ID retornado pela Meta e o timestamp para persistência fiel
        const savedObject = {
            id: wamid,
            from: channel.phone_number_id,
            to: cleanPhone,
            type: "interactive",
            interactive: interactiveData,
            timestamp: new Date().toISOString()
        };

        return {
            wamid,
            savedObject
        };
    }
};

module.exports = InteractiveSender;

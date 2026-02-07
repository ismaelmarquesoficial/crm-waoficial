/**
 * Processador especializado em converter respostas interativas da Meta (Replies)
 * em conteúdo legível para o CRM.
 */
const InteractiveReceiver = {
    /**
     * Extrai o texto (corpo) da resposta do usuário a partir do payload do webhook
     * @param {Object} messageData - O objeto 'message' do webhook da Meta
     * @returns {Object} { body: String, type: 'text' }
     */
    processReply: (messageData) => {
        const type = messageData.type;
        let body = '';

        // 1. Resposta de Botão Direta
        if (type === 'button_reply' || messageData.button_reply) {
            const reply = messageData.button_reply || type.button_reply;
            body = reply.title || reply.id;
        }
        // 2. Resposta de Lista Direta
        else if (type === 'list_reply' || messageData.list_reply) {
            const reply = messageData.list_reply || type.list_reply;
            const title = reply.title || reply.id;
            const description = reply.description ? `\n${reply.description}` : '';
            body = `${title}${description}`;
        }
        // 3. Encapsulado em Interactive (Padrão Meta v19+)
        else if (type === 'interactive' || messageData.interactive) {
            const interactive = messageData.interactive;

            if (interactive.button_reply) {
                body = interactive.button_reply.title || interactive.button_reply.id;
            } else if (interactive.list_reply) {
                const reply = interactive.list_reply;
                const title = reply.title || reply.id;
                const description = reply.description ? `\n${reply.description}` : '';
                body = `${title}${description}`;
            } else {
                body = '[Mensagem Interativa]';
            }
        }
        // 4. Botão Simples (Templates)
        else if (type === 'button') {
            body = messageData.button.text;
        }

        return {
            body: body || '[Mensagem Interativa]',
            mediaType: 'text' // Sempre normalizamos para texto para renderizar na conversa
        };
    }
};

module.exports = InteractiveReceiver;

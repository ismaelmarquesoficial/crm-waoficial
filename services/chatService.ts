/**
 * Serviço responsável por toda a comunicação com a API de Chat.
 */
export const chatService = {
    /**
     * Envia uma mídia (áudio, imagem, doc) para um contato.
     * Atualizado para apontar para o Core V2 (WhatsApp Oficial).
     */
    sendMedia: async (contactId: string, channelId: string, blob: Blob, type: string) => {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('file', blob, 'recording.webm');
        formData.append('type', type);
        formData.append('channelId', channelId);

        console.log(`[chatService] 📤 Enviando ${type} para o endpoint V2...`);

        const response = await fetch(`http://localhost:3001/api/v2/messages/${contactId}/send-media`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('[chatService] ❌ Erro na resposta da API:', error);
            throw new Error(error.error || 'Erro ao enviar mídia');
        }

        const data = await response.json();
        console.log('[chatService] ✅ Resposta da API:', data);
        return data;
    }
};

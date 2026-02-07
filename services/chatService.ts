/**
 * Serviço responsável por toda a comunicação com a API de Chat.
 */
export const chatService = {
    /**
     * Envia uma mídia (áudio, imagem, doc) para um contato.
     */
    sendMedia: async (contactId: string, formData: FormData) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3001/api/chat/${contactId}/send-media`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erro ao enviar mídia');
        }

        return response.json();
    }
};

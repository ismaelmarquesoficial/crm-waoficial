const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

/**
 * Cliente centralizado para comunicação direta com a API do WhatsApp (Meta)
 * Versão da API: v21.0
 */
const Client = {
    /**
     * Realiza o upload de um arquivo de mídia para os servidores da Meta
     */
    uploadMedia: async (phoneNumberId, token, filePath, mimeType) => {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        formData.append('type', mimeType);
        formData.append('messaging_product', 'whatsapp');

        const response = await axios.post(
            `https://graph.facebook.com/v21.0/${phoneNumberId}/media`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return response.data.id;
    },

    /**
     * Envia uma mensagem seguindo o formato JSON específico da API Oficial
     */
    sendMessage: async (phoneNumberId, token, payload) => {
        const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
        const response = await axios.post(url, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    },

    /**
     * Obtém a URL temporária para download de uma mídia
     */
    getMediaUrl: async (mediaId, token) => {
        const response = await axios.get(`https://graph.facebook.com/v21.0/${mediaId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data.url;
    },

    /**
     * Baixa o arquivo de mídia da Meta como um stream
     */
    downloadMediaStream: async (url, token) => {
        return axios({
            url,
            method: 'GET',
            responseType: 'stream',
            headers: { Authorization: `Bearer ${token}` }
        });
    }
};

module.exports = Client;

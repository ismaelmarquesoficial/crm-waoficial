const axios = require('axios');

/**
 * Utilitário para extrair metadados Open Graph de uma URL
 */
const metadataFetcher = {
    fetch: async (url) => {
        try {
            if (!url.startsWith('http')) {
                url = 'https://' + url;
            }

            const response = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 5000
            });

            const html = response.data;

            const getMeta = (property) => {
                const regex = new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:)?${property}["'][^>]+content=["']([^"']+)["']`, 'i');
                const match = html.match(regex);
                if (match) return match[1];

                // Tenta formato invertido (content antes)
                const regexRev = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:)?${property}["']`, 'i');
                const matchRev = html.match(regexRev);
                return matchRev ? matchRev[1] : null;
            };

            const getTitle = () => {
                const match = html.match(/<title>([^<]+)<\/title>/i);
                return match ? match[1] : null;
            };

            return {
                title: getMeta('title') || getTitle() || '',
                description: getMeta('description') || '',
                image: getMeta('image') || '',
                url: url
            };
        } catch (error) {
            console.error('Erro ao buscar metadados da URL:', error.message);
            return null;
        }
    }
};

module.exports = metadataFetcher;

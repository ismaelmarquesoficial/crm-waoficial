
const db = require('./db');

(async () => {
    try {
        console.log('🔄 Adicionando colunas de mensagem na tabela CAMPAIGNS...');

        await db.query(`
            ALTER TABLE campaigns 
            ADD COLUMN IF NOT EXISTS message TEXT,
            ADD COLUMN IF NOT EXISTS media_url TEXT,
            ADD COLUMN IF NOT EXISTS media_type VARCHAR(50);
        `);

        console.log('✅ Colunas message/media adicionadas com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro ao adicionar colunas:', err);
        process.exit(1);
    }
})();

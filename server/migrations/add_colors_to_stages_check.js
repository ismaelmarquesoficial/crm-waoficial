
const db = require('./db');

(async () => {
    try {
        console.log('🔄 Verificando coluna COLOR em PIPELINE_STAGES...');

        await db.query(`
            ALTER TABLE pipeline_stages 
            ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#CBD5E1';
        `);

        console.log('✅ Coluna COLOR garantida!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro:', err);
        process.exit(1);
    }
})();

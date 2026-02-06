const db = require('./db');

async function run() {
    try {
        console.log('🔄 Adicionando pix_key e custom_variables...');
        await db.query(`
      ALTER TABLE tenants 
      ADD COLUMN IF NOT EXISTS pix_key VARCHAR(255),
      ADD COLUMN IF NOT EXISTS custom_variables JSONB DEFAULT '[]'::jsonb;
    `);
        console.log('✅ Colunas adicionadas com sucesso!');
    } catch (e) {
        console.error('❌ Erro:', e);
    } finally {
        process.exit();
    }
}
run();

const db = require('./db');

async function addLastErrorColumn() {
    try {
        console.log('🔄 Adicionando coluna last_error na tabela whatsapp_accounts...');
        await db.query(`ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS last_error TEXT;`);
        console.log('✅ Coluna last_error adicionada!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro:', err);
        process.exit(1);
    }
}

addLastErrorColumn();

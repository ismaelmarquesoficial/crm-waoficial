const db = require('./db');

async function addUpdatedAtColumn() {
    try {
        console.log('🔄 Adicionando coluna updated_at na tabela whatsapp_accounts...');

        await db.query(`
      ALTER TABLE whatsapp_accounts 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
    `);

        console.log('✅ Coluna updated_at adicionada com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro ao atualizar schema:', err);
        process.exit(1);
    }
}

addUpdatedAtColumn();

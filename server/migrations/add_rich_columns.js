const db = require('./db');

async function addRichInfoColumns() {
    try {
        console.log('🛠️ Atualizando tabela whatsapp_accounts com colunas ricas...');

        await db.query(`
      ALTER TABLE whatsapp_accounts 
      ADD COLUMN IF NOT EXISTS quality_rating VARCHAR(50),
      ADD COLUMN IF NOT EXISTS display_phone_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS verified_name VARCHAR(255);
    `);

        console.log('✅ Colunas quality_rating, display_phone_number e verified_name adicionadas!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro ao atualizar schema:', err);
        process.exit(1);
    }
}

addRichInfoColumns();

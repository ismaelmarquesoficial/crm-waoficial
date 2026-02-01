const db = require('./db');

async function updateWhatsAppSchema() {
    try {
        console.log('🔄 Atualizando tabela whatsapp_accounts...');

        // Adiciona as colunas se não existirem
        await db.query(`
      ALTER TABLE whatsapp_accounts 
      ADD COLUMN IF NOT EXISTS waba_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS app_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS app_secret VARCHAR(255),
      ADD COLUMN IF NOT EXISTS permanent_token TEXT;
    `);

        console.log('✅ Colunas adicionadas com sucesso!');
        console.log('Novas colunas: waba_id, app_id, app_secret, permanent_token');

        process.exit(0);
    } catch (err) {
        console.error('❌ Erro ao atualizar schema:', err);
        process.exit(1);
    }
}

updateWhatsAppSchema();

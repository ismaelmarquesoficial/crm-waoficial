const db = require('./db');

const run = async () => {
    try {
        console.log('🔄 Atualizando Schema da Tabela whatsapp_templates...');
        await db.query(`
            ALTER TABLE whatsapp_templates 
            ADD COLUMN IF NOT EXISTS header_var_names TEXT[], 
            ADD COLUMN IF NOT EXISTS body_var_names TEXT[];
        `);
        console.log('✅ Schema Atualizado com Sucesso (Colunas var_names adicionadas).');
        process.exit(0);
    } catch (e) {
        console.error('❌ Erro na Migration:', e);
        process.exit(1);
    }
};

run();

const db = require('../db');

async function addFileHashColumn() {
    try {
        console.log('🔄 Iniciando migração: Adicionando coluna file_hash em chat_logs...');

        // Adiciona a coluna file_hash se ela não existir
        await db.query(`
      ALTER TABLE chat_logs 
      ADD COLUMN IF NOT EXISTS file_hash text;
    `);

        console.log('✅ Sucesso: Coluna file_hash adicionada com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro na migração:', err.message);
        process.exit(1);
    }
}

addFileHashColumn();

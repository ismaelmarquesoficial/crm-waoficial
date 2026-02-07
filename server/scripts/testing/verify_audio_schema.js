const fs = require('fs');
const path = require('path');
const db = require('./db');

console.log('🚀 Iniciando verificação de schema...');

async function verifySchema() {
    try {
        console.log('Conectando ao banco...');
        // Test query
        await db.query('SELECT 1');

        const res = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'chat_logs' 
            AND column_name IN ('media_type', 'media_format', 'file_path_ogg', 'file_path_mp3', 'meta_media_id');
        `);

        console.log('--- Colunas Encontradas na Tabela chat_logs ---');
        res.rows.forEach(row => {
            console.log(`✅ ${row.column_name} (${row.data_type})`);
        });

        const expectedColumns = ['media_type', 'media_format', 'file_path_ogg', 'file_path_mp3', 'meta_media_id'];
        const foundColumns = res.rows.map(r => r.column_name);
        const missing = expectedColumns.filter(c => !foundColumns.includes(c));

        let msg = '';
        if (missing.length > 0) {
            msg = `❌ Colunas Faltando: ${missing.join(', ')}`;
            console.error(msg);
        } else {
            msg = '✨ Todas as colunas de áudio foram criadas corretamente!';
            console.log(msg);
        }

        fs.writeFileSync(path.join(__dirname, 'schema_verify_result.txt'), msg);

    } catch (err) {
        console.error('Erro ao verificar schema:', err);
        try {
            fs.writeFileSync(path.join(__dirname, 'schema_verify_result.txt'), `Erro fatal: ${err.message}`);
        } catch (e) {
            console.error('Falha ao escrever arquivo de erro:', e);
        }
    } finally {
        console.log('Finalizando processo...');
        process.exit();
    }
}

verifySchema();

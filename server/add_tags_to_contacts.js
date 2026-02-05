const db = require('./db');

const run = async () => {
    const client = await db.pool.connect();
    try {
        console.log('🏷️ Adicionando coluna de tags à tabela contacts...');
        await client.query('BEGIN');

        // Adicionar coluna tags como JSONB array
        await client.query(`
            ALTER TABLE contacts 
            ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
        `);

        // Criar índice GIN para busca eficiente em arrays
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_contacts_tags 
            ON contacts USING GIN(tags);
        `);

        console.log('✅ Coluna tags adicionada com sucesso!');
        await client.query('COMMIT');

    } catch (e) {
        console.error('❌ Erro na migration:', e);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        process.exit();
    }
};

run();

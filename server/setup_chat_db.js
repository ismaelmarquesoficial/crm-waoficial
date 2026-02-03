const db = require('./db');

const run = async () => {
    const client = await db.pool.connect();
    try {
        console.log('📦 Atualizando Schema do Chat...'); // Corrigido a string de escape
        await client.query('BEGIN');

        // 1. Garantir Tabela chat_logs com colunas certas
        // Se já existe, ALTER TABLE para adicionar colunas faltantes
        // wamid já existe (baseado no código service.js)

        // Status Column
        await client.query(`
            ALTER TABLE chat_logs 
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'read',
            ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
        `);

        // 2. Indexes de Performance
        // Index Composto para buscar mensagens de um contato rapidamente
        // Índices para Performance
        await client.query("CREATE INDEX IF NOT EXISTS idx_chat_logs_contact ON chat_logs(tenant_id, contact_id);");
        // phone_number não existe na tabela chat_logs (normalizada), removido.

        // Super Index para listagem rápida
        await client.query("CREATE INDEX IF NOT EXISTS idx_chat_logs_composite ON chat_logs(tenant_id, contact_id, created_at DESC);");
        await client.query("CREATE INDEX IF NOT EXISTS idx_chat_logs_wamid ON chat_logs(wamid);");
        await client.query("CREATE INDEX IF NOT EXISTS idx_chat_logs_timestamp ON chat_logs (timestamp DESC);");

        console.log('✅ Schema e Indexes atualizados!');
        await client.query('COMMIT');

    } catch (e) {
        console.error('Erro na migration:', e);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        process.exit();
    }
};

run();

const db = require('./db');

const run = async () => {
    const client = await db.pool.connect();
    try {
        console.log('📦 Atualizando Schema do Chat para Áudio...');
        await client.query('BEGIN');

        /*
            ALTER TABLE chat_logs 
            ADD COLUMN IF NOT EXISTS media_type VARCHAR(20),        -- 'audio', 'image', 'video'
            ADD COLUMN IF NOT EXISTS media_format VARCHAR(10),      -- 'ogg', 'mp3'
            ADD COLUMN IF NOT EXISTS file_path_ogg TEXT,            -- Caminho relativo para envio (WhatsApp)
            ADD COLUMN IF NOT EXISTS file_path_mp3 TEXT,            -- Caminho relativo para o navegador (Player)
            ADD COLUMN IF NOT EXISTS meta_media_id VARCHAR(100);    -- ID retornado pela API da Meta (Cache)
        */

        await client.query(`
            ALTER TABLE chat_logs 
            ADD COLUMN IF NOT EXISTS media_type VARCHAR(20),
            ADD COLUMN IF NOT EXISTS media_format VARCHAR(10),
            ADD COLUMN IF NOT EXISTS file_path_ogg TEXT,
            ADD COLUMN IF NOT EXISTS file_path_mp3 TEXT,
            ADD COLUMN IF NOT EXISTS meta_media_id VARCHAR(100);
        `);

        console.log('✅ Colunas de áudio adicionadas com sucesso!');
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

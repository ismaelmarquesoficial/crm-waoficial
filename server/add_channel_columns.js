const db = require('./db');
const fs = require('fs');

async function addChannelColumns() {
    console.log('🔄 Verificando e adicionando colunas "channel"...');

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Adicionar channel em contacts
        console.log('📦 Verificando tabela contacts...');
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contacts' AND column_name='channel') THEN 
                    ALTER TABLE contacts ADD COLUMN channel VARCHAR(50) DEFAULT 'WhatsApp'; 
                    RAISE NOTICE 'Coluna channel adicionada em contacts';
                END IF; 
            END $$;
        `);

        // 2. Adicionar channel em chat_logs
        console.log('💬 Verificando tabela chat_logs...');
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_logs' AND column_name='channel') THEN 
                    ALTER TABLE chat_logs ADD COLUMN channel VARCHAR(50) DEFAULT 'WhatsApp'; 
                    RAISE NOTICE 'Coluna channel adicionada em chat_logs';
                END IF; 
            END $$;
        `);

        await client.query('COMMIT');
        console.log('✅ Colunas verificadas/adicionadas com sucesso!');
        process.exit(0);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao adicionar colunas:', err);
        process.exit(1);
    } finally {
        client.release();
    }
}

addChannelColumns();

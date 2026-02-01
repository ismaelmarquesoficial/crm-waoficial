const db = require('./db');

(async () => {
    try {
        console.log('📦 Criando tabela whatsapp_templates...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_templates (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER,
                account_id INTEGER REFERENCES whatsapp_accounts(id) ON DELETE CASCADE,
                waba_id VARCHAR(255) NOT NULL,
                meta_id VARCHAR(255),
                name VARCHAR(255) NOT NULL,
                language VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL,
                category VARCHAR(50),
                components JSONB,
                last_synced_at TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(waba_id, name, language)
            );
        `);

        console.log('✅ Tabela whatsapp_templates criada com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro ao criar tabela:', err);
        process.exit(1);
    }
})();

const db = require('./db');

const createTables = async () => {
    try {
        console.log('📦 Criando tabelas de Campanha...');

        // Tabela de Campanhas (Header)
        await db.query(`
            CREATE TABLE IF NOT EXISTS campaigns (
                id SERIAL PRIMARY KEY,
                tenant_id INT NOT NULL,
                whatsapp_account_id INT NOT NULL,
                template_id INT NOT NULL,
                name VARCHAR(255) NOT NULL,
                status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, processing, completed, paused
                scheduled_at TIMESTAMP DEFAULT NOW(),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Tabela de Destinatários (Items)
        await db.query(`
            CREATE TABLE IF NOT EXISTS campaign_recipients (
                id SERIAL PRIMARY KEY,
                campaign_id INT REFERENCES campaigns(id) ON DELETE CASCADE,
                tenant_id INT NOT NULL, -- Denormalização para performance do Fair Share
                phone VARCHAR(50) NOT NULL,
                variables JSONB DEFAULT '{}', -- Para substituir {{1}}, {{2}}
                status VARCHAR(50) DEFAULT 'pending', -- pending, processing, sent, failed
                message_id VARCHAR(100), -- ID retornado pela Meta
                error_log TEXT,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Índices para Alta Performance do Worker
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_recipients_worker ON campaign_recipients(status, tenant_id);
            CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
        `);

        console.log('✅ Tabelas criadas com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro ao criar tabelas:', err);
        process.exit(1);
    }
};

createTables();

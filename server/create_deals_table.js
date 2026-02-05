
const db = require('./db');

(async () => {
    try {
        console.log('🔄 Criando tabela DEALS (Negócios)...');

        await db.query(`
            CREATE TABLE IF NOT EXISTS deals (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id),
                contact_id INTEGER NOT NULL REFERENCES contacts(id),
                pipeline_id INTEGER NOT NULL REFERENCES pipelines(id),
                stage_id INTEGER NOT NULL REFERENCES pipeline_stages(id),
                title VARCHAR(255) NOT NULL,
                value DECIMAL(10, 2) DEFAULT 0,
                status VARCHAR(50) DEFAULT 'open', -- open, won, lost
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Index para performance
        await db.query(`CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage_id);`);

        console.log('✅ Tabela DEALS criada com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro ao criar tabela deals:', err);
        process.exit(1);
    }
})();

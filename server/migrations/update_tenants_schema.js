const db = require('./db');

async function updateTenantsSchema() {
    try {
        console.log('🔄 Atualizando esquema da tabela tenants...');

        // Adicionar colunas de informações da empresa
        await db.query(`
            ALTER TABLE tenants 
            ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS cnpj VARCHAR(20),
            ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
            ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
            ADD COLUMN IF NOT EXISTS address TEXT,
            ADD COLUMN IF NOT EXISTS website VARCHAR(255),
            ADD COLUMN IF NOT EXISTS plan_type VARCHAR(50) DEFAULT 'basic',
            ADD COLUMN IF NOT EXISTS plan_limits JSONB DEFAULT '{"users": 3, "connections": 1}'::jsonb;
        `);

        console.log('✅ Tabela tenants atualizada com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro ao atualizar tabela tenants:', err);
        process.exit(1);
    }
}

updateTenantsSchema();

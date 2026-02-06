const db = require('../db');

async function createQuickRepliesTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS quick_replies (
                id SERIAL PRIMARY KEY,
                tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
                shortcut VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(tenant_id, shortcut)
            );
            
            CREATE INDEX IF NOT EXISTS idx_quick_replies_tenant ON quick_replies(tenant_id);
            CREATE INDEX IF NOT EXISTS idx_quick_replies_shortcut ON quick_replies(tenant_id, shortcut);
        `);

        console.log('✅ Tabela quick_replies criada com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao criar tabela quick_replies:', error);
        throw error;
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    createQuickRepliesTable()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = createQuickRepliesTable;

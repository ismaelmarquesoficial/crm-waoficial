
const db = require('./db');

(async () => {
    try {
        console.log('🔄 Atualizando schema da tabela CAMPAIGNS...');

        await db.query(`
            ALTER TABLE campaigns 
            ADD COLUMN IF NOT EXISTS crm_pipeline_id INTEGER REFERENCES pipelines(id),
            ADD COLUMN IF NOT EXISTS crm_stage_id INTEGER REFERENCES pipeline_stages(id),
            ADD COLUMN IF NOT EXISTS crm_trigger_rule VARCHAR(20) DEFAULT 'none'; 
        `);

        // Rules: 'none' (default), 'on_sent', 'on_reply'

        console.log('✅ Schema atualizado com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro ao atualizar schema:', err);
        process.exit(1);
    }
})();

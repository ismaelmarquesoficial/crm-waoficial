
const db = require('./db');

(async () => {
    try {
        console.log('🔍 Investigando a última campanha criada...');

        const res = await db.query(`
            SELECT id, name, status, crm_pipeline_id, crm_stage_id, crm_trigger_rule, created_at
            FROM campaigns 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (res.rows.length === 0) {
            console.log('❌ Nenhuma campanha encontrada.');
        } else {
            console.log('📋 Dados da Última Campanha:');
            console.table(res.rows);

            const c = res.rows[0];
            if (c.crm_trigger_rule === 'on_sent' && c.crm_pipeline_id) {
                console.log('✅ Configuração de CRM parece correta no banco.');
                console.log('👉 Se o card não criou, o problema é no Worker (server/workers/campaignDispatcher.js).');
                console.log('⚠️ DICA: Você reiniciou o servidor (npm run dev) após as últimas mudanças no código?');
            } else {
                console.log('❌ Configuração de CRM ausente ou incorreta.');
                console.log(`Pipeline: ${c.crm_pipeline_id}, Stage: ${c.crm_stage_id}, Rule: ${c.crm_trigger_rule}`);
                console.log('👉 O problema pode estar no envio do Frontend ou na rota de criação.');
            }
        }
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro:', err);
        process.exit(1);
    }
})();

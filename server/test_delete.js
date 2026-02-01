const db = require('./db');
const run = async () => {
    try {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // Pegar a última campanha
            const last = await client.query('SELECT id FROM campaigns ORDER BY id DESC LIMIT 1');
            if (last.rowCount === 0) {
                console.log('Sem campanhas para testar');
                process.exit();
            }
            const id = last.rows[0].id;
            console.log(`Tentando deletar campanha ID: ${id}`);

            // 1. Apagar recipients
            await client.query("DELETE FROM campaign_recipients WHERE campaign_id = $1", [id]);
            console.log('Recipients apagados.');

            // 2. Apagar campanha
            await client.query("DELETE FROM campaigns WHERE id = $1", [id]);
            console.log('Campanha apagada.');

            await client.query('ROLLBACK'); // Não deleta de verdade no test
            console.log('Teste ROLLBACK com sucesso. A query SQL funciona.');

        } catch (err) {
            console.error('🔥 ERRO SQL:', err.message);
            if (err.detail) console.error('Detalhe:', err.detail);
            if (err.table) console.error('Tabela:', err.table);
            if (err.constraint) console.error('Constraint:', err.constraint);
            await client.query('ROLLBACK');
        } finally {
            client.release();
        }
    } catch (e) {
        console.error(e);
    }
    process.exit();
};
run();

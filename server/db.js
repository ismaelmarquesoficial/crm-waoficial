const { Pool, types } = require('pg');
require('dotenv').config();

// FORÇAR UTC EM TIMESTAMPS (OID 1114)
// Isso impede que o Node converta 20:00 (UTC) para 20:00 (Local) e gere erro de 3h.
types.setTypeParser(1114, (str) => new Date(str + 'Z'));

const pool = new Pool({
    user: 'us_saas',
    host: '145.223.30.236',
    database: 'db_saas',
    password: 'nryq3]pkWsXm{S-LR35GzErjA9LpU_#aE',
    port: 5433,
    ssl: false
});

// Listener para erros em clientes ociosos (evita crash do Node)
pool.on('error', (err, client) => {
    console.error('⚠️ [DB POOL] Erro inesperado no cliente ocioso:', err.message);
    // Não encerramos o processo, apenas logamos
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool // Exportando o pool também para permitir transactions
};

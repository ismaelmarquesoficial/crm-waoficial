const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: 'us_saas',
    host: '145.223.30.236',
    database: 'db_saas',
    password: 'nryq3]pkWsXm{S-LR35GzErjA9LpU_#aE',
    port: 5433,
    ssl: false
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};


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

(async () => {
    try {
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);

        for (const table of tablesRes.rows) {
            const tableName = table.table_name;
            const colsRes = await pool.query(`
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position
            `, [tableName]);

            console.log(`\n📦 TABLE: ${tableName}`);
            console.table(colsRes.rows.map(c => ({
                col: c.column_name,
                type: c.data_type,
                null: c.is_nullable === 'YES' ? '✅' : '❌',
                default: c.column_default ? c.column_default.substring(0, 20) : ''
            })));
        }

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
})();

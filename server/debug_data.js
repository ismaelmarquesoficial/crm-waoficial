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

async function debugData() {
    try {
        // 1. Check User tenant_id
        const userRes = await pool.query("SELECT id, email, tenant_id FROM users WHERE email = 'admin@talke.ia'");
        console.log('User:', userRes.rows[0]);

        // 2. Check Tenants
        const tenantRes = await pool.query("SELECT * FROM tenants");
        console.log('Tenants:', tenantRes.rows);

        // 3. Check Pipelines
        const pipeRes = await pool.query("SELECT * FROM pipelines");
        console.log('Pipelines:', pipeRes.rows);

        // 4. Check Contacts
        const contactRes = await pool.query("SELECT id, name, tenant_id, current_stage_id FROM contacts LIMIT 5");
        console.log('Contacts (first 5):', contactRes.rows);

        pool.end();
    } catch (err) {
        console.error(err);
        pool.end();
    }
}

debugData();

const { Pool } = require('pg');
const db = require('./db');

async function inspectWhatsApp() {
    try {
        const res = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'whatsapp_accounts'
    `);
        console.log('Columns in whatsapp_accounts:', res.rows);
        process.exit(0);
    } catch (err) {
        console.error('Error connecting:', err);
        process.exit(1);
    }
}

inspectWhatsApp();

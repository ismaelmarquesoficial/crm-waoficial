const db = require('./server/db');

async function run() {
    try {
        console.log("Consultando contatos do Tenant 4...");
        const res = await db.query("SELECT id, name, phone, created_at FROM contacts WHERE tenant_id = 4 ORDER BY id");
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    }
    process.exit();
}

run();

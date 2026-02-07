const db = require('./db');

async function migrate() {
    try {
        console.log('Adding email column to contacts table...');
        await db.query(`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email VARCHAR(255)`);
        console.log('Success: email column added/verified.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();

const db = require('./db');

async function run() {
    try {
        console.log('Adding columns to contacts table...');
        await db.query(`
      ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS notes TEXT;
    `);
        console.log('Columns added successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

run();

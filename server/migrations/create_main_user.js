const db = require('./db');
const bcrypt = require('bcryptjs');

async function createTestUser() {
    const email = 'admin@talke.ia';
    const password = 'admin';
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        // Check if user exists
        const check = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            console.log(`Test user already exists: ${email} / ${password}`);
            process.exit(0);
        }

        // Create user
        // Assuming tenant_id 1 exists or is nullable. If tenants table exists, we might need one.
        // Let's check tenants first just in case, or default to 1 and hope constraints allow/ignore.
        // Based on schema: tenant_id integer.

        // Insert
        await db.query(
            `INSERT INTO users (tenant_id, name, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
            [1, 'Admin User', email, hashedPassword, 'admin']
        );

        console.log(`Created test user: ${email} / ${password}`);
    } catch (err) {
        console.error('Error creating test user:', err);
    } finally {
        // We can't easily close the pool from the module export without a method, 
        // but the script will exit anyway.
        process.exit(0);
    }
}

createTestUser();

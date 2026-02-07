const db = require('./db');
const bcrypt = require('bcryptjs');

async function createSuperAdmin() {
    const email = 'superadmin@talke.ia';
    const password = 'root'; // Senha simplificada para teste
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        // 1. Check if user exists
        const check = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            // Update to ensure role is superadmin
            await db.query('UPDATE users SET role = $1, password_hash = $2 WHERE email = $3', ['superadmin', hashedPassword, email]);
            console.log(`Superadmin updated: ${email} / ${password} (Role: superadmin)`);
            process.exit(0);
        }

        // 2. Create user (Linked to Tenant 1 for now)
        await db.query(
            `INSERT INTO users (tenant_id, name, email, password_hash, role, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [1, 'Super Admin', email, hashedPassword, 'superadmin']
        );

        console.log(`✅ Superadmin created: ${email} / ${password}`);
    } catch (err) {
        console.error('❌ Error creating superadmin:', err);
    } finally {
        process.exit(0);
    }
}

createSuperAdmin();

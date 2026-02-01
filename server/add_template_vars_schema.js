const db = require('./db');

const migrate = async () => {
    try {
        console.log('Iniciando Migration...');
        await db.query('ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS header_vars_count INTEGER DEFAULT 0;');
        await db.query('ALTER TABLE whatsapp_templates ADD COLUMN IF NOT EXISTS body_vars_count INTEGER DEFAULT 0;');
        console.log('Migration OK: Colunas header_vars_count e body_vars_count adicionadas.');
        process.exit(0);
    } catch (e) {
        console.error('Migration Failed:', e);
        process.exit(1);
    }
};
migrate();

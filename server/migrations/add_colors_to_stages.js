const db = require('./db');

async function migrateColors() {
    try {
        // 1. Add color column if it doesn't exist
        await db.query(`
      ALTER TABLE pipeline_stages 
      ADD COLUMN IF NOT EXISTS color VARCHAR(50) DEFAULT 'bg-slate-500';
    `);
        console.log('✅ Column "color" added to pipeline_stages.');

        // 2. Update existing stages with diverse colors
        // We'll map order_index (0 to 4) to specific colors
        const updates = [
            { idx: 0, color: 'bg-indigo-500' }, // Novo Lead
            { idx: 1, color: 'bg-blue-500' },   // Qualificação
            { idx: 2, color: 'bg-amber-500' },  // Proposta
            { idx: 3, color: 'bg-purple-500' }, // Negociação
            { idx: 4, color: 'bg-emerald-500' } // Fechado
        ];

        for (const up of updates) {
            await db.query(`
        UPDATE pipeline_stages 
        SET color = $1 
        WHERE order_index = $2
      `, [up.color, up.idx]);
        }
        console.log('✅ Stage colors updated.');

        process.exit(0);
    } catch (err) {
        console.error('Error migrating colors:', err);
        process.exit(1);
    }
}

migrateColors();

const db = require('./db');

async function debugData() {
    try {
        console.log('🔍 Buscando Tenants e Canais...');

        const tenants = await db.query("SELECT id, name FROM tenants LIMIT 5");
        console.log('\n--- Tenants (TOP 5) ---');
        tenants.rows.forEach(t => console.log(`ID: ${t.id} | Nome: ${t.name}`));

        if (tenants.rows.length > 0) {
            const firstTenant = tenants.rows[0].id;
            console.log(`\n🔍 Verificando Canais para Tenant ${firstTenant}...`);

            const channels = await db.query("SELECT id, name, status, tenant_id FROM whatsapp_accounts WHERE tenant_id = $1", [firstTenant]);
            console.log('--- Canais Encontrados ---');
            if (channels.rows.length === 0) {
                console.log('❌ NENHUM CANAL NESTE TENANT.');
            } else {
                channels.rows.forEach(c => console.log(`ID: ${c.id} | Status: ${c.status} | Nome: ${c.name}`));
            }

            // Procura qualquer canal conectado em qualquer tenant
            const anyActive = await db.query("SELECT id, tenant_id, status FROM whatsapp_accounts WHERE status = 'CONNECTED' LIMIT 1");
            if (anyActive.rows.length > 0) {
                const msg = `\n✨ CANAL ATIVO: Tenant ${anyActive.rows[0].tenant_id} | Channel ${anyActive.rows[0].id}\n`;
                console.log(msg);
                fs.writeFileSync('server/debug_result.txt', msg);
            } else {
                console.log('\n❌ NENHUM canal com status CONNECTED.');
                fs.writeFileSync('server/debug_result.txt', 'Nenhum canal conectado.');
            }
        }
    } catch (err) {
        console.error('Erro ao consultar:', err);
    } finally {
        process.exit();
    }
}
const fs = require('fs');
debugData();

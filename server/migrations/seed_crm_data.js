const db = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
    console.log('🌱 Iniciando Seed...');

    try {
        // 1. Garantir Tenant
        // Vamos assumir ID 1 para simplificar, ou criar se não existir
        let tenantId = 1;
        const tenantCheck = await db.query('SELECT id FROM tenants WHERE id = $1', [tenantId]);

        if (tenantCheck.rows.length === 0) {
            const tenantRes = await db.query(`
        INSERT INTO tenants (name, plan_status) VALUES ($1, $2) RETURNING id
      `, ['Empresa Demo', 'active']);
            tenantId = tenantRes.rows[0].id;
            console.log('✅ Tenant criado ID:', tenantId);
        } else {
            console.log('ℹ️ Tenant ID 1 já existe.');
        }

        // 2. Garantir Usuário Admin (vinculado ao tenant)
        const email = 'admin@talke.ia';
        const userCheck = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin', 10);
            await db.query(`
            INSERT INTO users (tenant_id, name, email, password_hash, role)
            VALUES ($1, 'Admin', $2, $3, 'admin')
        `, [tenantId, email, hashedPassword]);
            console.log('✅ Usuário Admin criado.');
        }

        // 3. Criar Pipeline de Vendas
        let pipelineId;
        const pipeCheck = await db.query('SELECT id FROM pipelines WHERE tenant_id = $1 AND name = $2', [tenantId, 'Funil de Vendas']);
        if (pipeCheck.rows.length > 0) {
            pipelineId = pipeCheck.rows[0].id;
            console.log('ℹ️ Pipeline "Funil de Vendas" já existe ID:', pipelineId);
        } else {
            const pipeRes = await db.query(`
            INSERT INTO pipelines (tenant_id, name) VALUES ($1, $2) RETURNING id
        `, [tenantId, 'Funil de Vendas']);
            pipelineId = pipeRes.rows[0].id;
            console.log('✅ Pipeline criado ID:', pipelineId);
        }

        // 4. Criar Estágios (Stages)
        const stageNames = ['Novo Lead', 'Qualificação', 'Proposta', 'Negociação', 'Fechado'];
        const stageIds = [];

        for (let i = 0; i < stageNames.length; i++) {
            const name = stageNames[i];
            // Verifica se stage existe nesse pipeline
            const stageCheck = await db.query('SELECT id FROM pipeline_stages WHERE pipeline_id = $1 AND name = $2', [pipelineId, name]);

            let sId;
            if (stageCheck.rows.length > 0) {
                sId = stageCheck.rows[0].id;
            } else {
                const sRes = await db.query(`
                INSERT INTO pipeline_stages (pipeline_id, name, order_index) VALUES ($1, $2, $3) RETURNING id
            `, [pipelineId, name, i]);
                sId = sRes.rows[0].id;
                console.log(`✅ Stage "${name}" criado.`);
            }
            stageIds.push(sId);
        }

        // 5. Criar Contatos/Leads Dummy
        // Vamos criar alguns leads espalhados pelos estágios
        const dummyContacts = [
            { name: 'Roberto Carlos', phone: '5511999990001', stageIdx: 0 },
            { name: 'Ana Maria', phone: '5511999990002', stageIdx: 1 },
            { name: 'Empresa X (João)', phone: '5511999990003', stageIdx: 2 },
            { name: 'Tech Solutions', phone: '5511999990004', stageIdx: 3 },
            { name: 'Supermercado Dia', phone: '5511999990005', stageIdx: 4 },
            { name: 'Cliente Novo', phone: '5511999990006', stageIdx: 0 }
        ];

        for (const c of dummyContacts) {
            const contactCheck = await db.query('SELECT id FROM contacts WHERE tenant_id = $1 AND phone = $2', [tenantId, c.phone]);

            if (contactCheck.rows.length === 0) {
                await db.query(`
                INSERT INTO contacts (tenant_id, current_stage_id, name, phone, created_at, last_interaction)
                VALUES ($1, $2, $3, $4, NOW(), NOW())
            `, [tenantId, stageIds[c.stageIdx], c.name, c.phone]);
                console.log(`✅ Contato "${c.name}" criado.`);
            }
        }

        console.log('🚀 Seed concluído com sucesso!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Erro no seed:', err);
        process.exit(1);
    }
}

seed();

const db = require('./db');
const axios = require('axios');

const forceSync = async () => {
    try {
        console.log('🔄 Iniciando Sincronização Forçada de Templates (Reparando Blueprints)...');

        // 1. Pegar todas as contas conectadas de todos os tenants
        const accounts = await db.query("SELECT id, tenant_id, waba_id, permanent_token, instance_name FROM whatsapp_accounts WHERE status IN ('CONNECTED', 'PENDING')");

        console.log(`📋 Encontradas ${accounts.rows.length} contas para processar.`);

        for (const channel of accounts.rows) {
            console.log(`\n🔹 Processando Conta: ${channel.instance_name} (Tenant ${channel.tenant_id})`);

            if (!channel.waba_id || !channel.permanent_token) {
                console.log('   ⚠️ Pulei: Sem Token/WABA ID');
                continue;
            }

            try {
                // Baixar Templates da Meta
                const url = `https://graph.facebook.com/v21.0/${channel.waba_id}/message_templates?limit=200`;
                const metaRes = await axios.get(url, { headers: { Authorization: `Bearer ${channel.permanent_token}` } });
                const templates = metaRes.data.data || [];

                console.log(`   📥 Baixados ${templates.length} templates.`);

                let updatedCount = 0;

                for (const tpl of templates) {
                    // CÁLCULO DO BLUEPRINT (Header/Body Counts) HÍBRIDO + UNIVERSAL

                    // DEBUG DETETIVE (Consultor): Verificar Formato
                    const format = tpl.parameter_format || 'NOT_SET (Default Positional?)';
                    console.log(`\n🔍 [TEMPLATE: ${tpl.name}] Format: ${format}`);

                    // Dump Components para achar 'example'
                    tpl.components.forEach(c => {
                        if (c.type === 'BODY' || c.type === 'HEADER') {
                            console.log(`   Comp [${c.type}]: Text="${c.text ? c.text.substring(0, 50) + '...' : 'N/A'}"`);
                            if (c.example) console.log(`   💡 Example Found:`, JSON.stringify(c.example));
                        }
                    });

                    // Função para contar variáveis (Blueprint Count)
                    const countVars = (txt) => {
                        if (!txt) return 0;
                        const matches = txt.match(/\{\{(.*?)\}\}/g);
                        if (!matches) return 0;
                        const isPositional = matches.some(m => /^\{\{\s*\d+\s*\}\}$/.test(m));
                        if (isPositional) {
                            return new Set(matches.map(m => m.replace(/\D/g, ''))).size;
                        } else {
                            return matches.length;
                        }
                    };

                    // Função para extrair NOMES das variáveis (Blueprint Names)
                    const extractNames = (txt) => {
                        if (!txt) return null;
                        const matches = txt.match(/\{\{(.*?)\}\}/g);
                        if (!matches) return null;
                        // Retorna array limpo ["Nome", "Telefone"] ou ["1", "2"]
                        return matches.map(m => m.replace(/[\{\}]/g, '').trim());
                    };

                    let hVars = 0, bVars = 0;
                    let hNames = null, bNames = null;

                    if (Array.isArray(tpl.components)) {
                        const hComp = tpl.components.find(c => c.type === 'HEADER' && c.format === 'TEXT');
                        if (hComp && hComp.text) {
                            hVars = countVars(hComp.text);
                            hNames = extractNames(hComp.text);
                        }

                        const bComp = tpl.components.find(c => c.type === 'BODY');
                        if (bComp && bComp.text) {
                            bVars = countVars(bComp.text);
                            bNames = extractNames(bComp.text);
                        }
                    }

                    // Salvar no Banco (Com nomes)
                    await db.query(`
                        INSERT INTO whatsapp_templates 
                        (tenant_id, account_id, waba_id, meta_id, name, language, status, category, components, last_synced_at, header_vars_count, body_vars_count, header_var_names, body_var_names)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10, $11, $12, $13)
                        ON CONFLICT (waba_id, name, language) 
                        DO UPDATE SET 
                            components = EXCLUDED.components,
                            header_var_names = EXCLUDED.header_var_names,
                            body_var_names = EXCLUDED.body_var_names,
                            last_synced_at = NOW();
                    `, [channel.tenant_id, channel.id, channel.waba_id, tpl.id, tpl.name, tpl.language, tpl.status, tpl.category, JSON.stringify(tpl.components), hVars, bVars, hNames, bNames]);

                    if (hVars > 0 || bVars > 0) updatedCount++;
                }
                console.log(`   ✅ Atualizados ${updatedCount} templates com variáveis.`);

            } catch (err) {
                console.error(`   ❌ Falha ao baixar templates: ${err.message}`);
                if (err.response) console.error('      Detalhe:', JSON.stringify(err.response.data));
            }
        }

        console.log('\n🏁 Sincronização Forçada Concluída!');
        process.exit(0);

    } catch (e) {
        console.error('🔥 Erro Global:', e);
        process.exit(1);
    }
};

forceSync();

const db = require('./db');

const checkTables = async () => {
    try {
        console.log('🔍 Verificando tabelas no banco de dados...\n');

        const result = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log('📋 Tabelas encontradas:');
        result.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

        console.log('\n🔍 Verificando estrutura da tabela deals...\n');
        const dealsStructure = await db.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'deals'
            ORDER BY ordinal_position
        `);

        console.log('📋 Colunas da tabela deals:');
        dealsStructure.rows.forEach(row => {
            console.log(`  - ${row.column_name} (${row.data_type})`);
        });

    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        process.exit();
    }
};

checkTables();

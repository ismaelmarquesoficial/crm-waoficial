const { Pool } = require('pg');

const pool = new Pool({
  user: 'us_saas',
  host: '145.223.30.236',
  database: 'db_saas',
  password: 'nryq3]pkWsXm{S-LR35GzErjA9LpU_#aE',
  port: 5433,
  ssl: false
});

async function inspect() {
  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables:', res.rows.map(r => r.table_name));

    // Check if there is a users table and get its columns
    const userTable = res.rows.find(r => r.table_name.includes('user') || r.table_name.includes('login') || r.table_name.includes('account'));

    if (userTable) {
      console.log(`Inspecting table: ${userTable.table_name}`);
      const cols = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '${userTable.table_name}'
        `);
      console.log('Columns:', cols.rows);
    }

    pool.end();
  } catch (err) {
    console.error('Error connecting:', err);
    pool.end();
  }
}

inspect();

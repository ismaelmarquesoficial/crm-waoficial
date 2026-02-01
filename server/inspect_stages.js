const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: 'us_saas',
  host: '145.223.30.236',
  database: 'db_saas',
  password: 'nryq3]pkWsXm{S-LR35GzErjA9LpU_#aE',
  port: 5433,
  ssl: false
});

async function inspectStages() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'pipeline_stages'
    `);
    console.log('Columns:', res.rows);
    pool.end();
  } catch (err) {
    console.error(err);
    pool.end();
  }
}

inspectStages();

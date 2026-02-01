const db = require('./db');
const run = async () => {
    const res = await db.query(`
        SELECT c.name, r.phone, r.variables 
        FROM campaign_recipients r
        JOIN campaigns c ON r.campaign_id = c.id
        ORDER BY r.id DESC LIMIT 10
    `);
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit();
};
run();

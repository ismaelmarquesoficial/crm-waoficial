const db = require('../../db');

async function inspectChatTables() {
  try {
    const t1 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contacts'");
    console.log('Contacts Columns:', t1.rows);

    const t2 = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'chat_logs'");
    console.log('Chat Logs Columns:', t2.rows);

    process.exit(0); // Ensure clean exit
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspectChatTables();

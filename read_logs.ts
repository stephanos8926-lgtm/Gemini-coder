import Database from 'better-sqlite3';

try {
  const db = new Database('./logs/log_persistence.db', { readonly: true });
  const rows = db.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 5').all();
  console.log(JSON.stringify(rows, null, 2));
} catch (error) {
  console.error("Error reading logs database:", error);
}

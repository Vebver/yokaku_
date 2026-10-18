/**
 * Dumps CREATE TABLE statements + FK relationships from the database
 * into erd-schema.sql — paste/import that file into dbdiagram.io
 * (or use it as a backup if MySQL Workbench won't open).
 *
 * Run: node scripts/dump-erd-schema.js
 */
const pool = require("../config/db");
const fs = require("fs");

(async () => {
  try {
    // 1. Table names
    const [tables] = await pool.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
       ORDER BY TABLE_NAME`,
      [process.env.DB_NAME],
    );

    // 2. CREATE TABLE statements (structure only, no data)
    let sql = "-- Auto-generated schema dump for ERD\n\n";
    for (const t of tables) {
      const [rows] = await pool.query(`SHOW CREATE TABLE \`${t.TABLE_NAME}\``);
      sql += rows[0]["Create Table"] + ";\n\n";
    }

    // 3. FK relationships summary
    const [fks] = await pool.query(
      `SELECT TABLE_NAME AS child, COLUMN_NAME AS fk_column,
              REFERENCED_TABLE_NAME AS parent,
              REFERENCED_COLUMN_NAME AS pk_column
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY TABLE_NAME`,
      [process.env.DB_NAME],
    );

    let rel = "-- FK Relationships\n";
    if (fks.length === 0) {
      rel +=
        "-- (none defined as MySQL foreign keys — links may be logical only)\n";
    }
    for (const f of fks) {
      rel += `-- ${f.child}.${f.fk_column} -> ${f.parent}.${f.pk_column}\n`;
    }
    sql += rel;

    fs.writeFileSync("erd-schema.sql", sql);
    console.log(
      `Dumped ${tables.length} tables and ${fks.length} FK constraints to erd-schema.sql`,
    );
    console.log(rel);
  } catch (err) {
    console.error("Failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

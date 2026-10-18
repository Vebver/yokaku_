/**
 * Converts the live database schema directly into dbdiagram.io DBML format.
 * Run: node scripts/dump-erd-dbml.js
 * Output: erd-schema.dbml  -> paste into dbdiagram.io
 */
const pool = require("../config/db");
const fs = require("fs");

function dbmlType(c) {
  const t = c.DATA_TYPE;
  const len = c.CHARACTER_MAXIMUM_LENGTH;
  if (t === "int" || t === "bigint") return "integer";
  if (t === "tinyint")
    return c.COLUMN_TYPE.startsWith("tinyint(1)") ? "boolean" : "integer";
  if (t === "decimal" || t === "numeric")
    return c.COLUMN_TYPE.replace(/unsigned|zerofill/g, "")
      .replace(/\s+/g, " ")
      .trim();
  if (t === "enum")
    return c.COLUMN_TYPE.replace(/enum/i, "enum").replace(/'/g, '"');
  if (t === "varchar") return `varchar${len ? `(${len})` : ""}`;
  if (t === "char") return `char${len ? `(${len})` : ""}`;
  if (t === "timestamp") return "timestamp";
  if (t === "datetime") return "datetime";
  if (t === "date") return "date";
  if (t === "time") return "time";
  if (
    t === "text" ||
    t === "mediumtext" ||
    t === "longtext" ||
    t === "tinytext"
  )
    return "text";
  if (t === "json") return "json";
  if (t === "float" || t === "double") return "float";
  if (t === "blob") return "blob";
  return t;
}

function dbmlDefault(c) {
  if (c.COLUMN_DEFAULT === null) return "";
  const t = c.DATA_TYPE;
  if (
    t === "int" ||
    t === "bigint" ||
    t === "tinyint" ||
    t === "decimal" ||
    t === "float" ||
    t === "double"
  ) {
    return `default: ${c.COLUMN_DEFAULT}`;
  }
  return `default: \`${String(c.COLUMN_DEFAULT).replace(/`/g, "")}\``;
}

(async () => {
  try {
    const [tables] = await pool.query(
      `SELECT TABLE_NAME, TABLE_COMMENT FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
      [process.env.DB_NAME],
    );

    const [cols] = await pool.query(
      `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, CHARACTER_MAXIMUM_LENGTH,
              COLUMN_KEY, EXTRA, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, ORDINAL_POSITION`,
      [process.env.DB_NAME],
    );

    const [fks] = await pool.query(
      `SELECT TABLE_NAME AS child, COLUMN_NAME AS fk_col,
              REFERENCED_TABLE_NAME AS parent, REFERENCED_COLUMN_NAME AS pk_col
       FROM information_schema.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
       ORDER BY TABLE_NAME`,
      [process.env.DB_NAME],
    );

    let out = `// Auto-generated DBML - paste into dbdiagram.io\n\n`;

    for (const t of tables) {
      const tcols = cols.filter((c) => c.TABLE_NAME === t.TABLE_NAME);
      out += `Table ${t.TABLE_NAME} {\n`;
      for (const c of tcols) {
        const isPk = c.COLUMN_KEY === "PRI";
        const isInc = c.EXTRA && c.EXTRA.includes("auto_increment");
        const settings = [];
        if (isPk) settings.push("pk");
        if (isInc) settings.push("increment");
        if (!isPk && !isInc && c.COLUMN_KEY === "UNI") settings.push("unique");
        if (!isPk && !isInc && c.IS_NULLABLE === "NO") settings.push("not null");
        if (!isPk && !isInc) {
          const d = dbmlDefault(c);
          if (d) settings.push(d);
        }
        if (c.COLUMN_COMMENT) {
          settings.push(`note: '${c.COLUMN_COMMENT.replace(/['\\]/g, "")}'`);
        }
        const clean = settings.filter(Boolean);
        out += `  "${c.COLUMN_NAME}" ${dbmlType(c)}${clean.length ? ` [${clean.join(", ")}]` : ""}\n`;
      }
      out += `}\n\n`;
    }

    out += `// ---- Relationships ----\n`;
    if (fks.length === 0) out += `// none\n`;
    for (const f of fks) {
      out += `Ref: ${f.child}.${f.fk_col} > ${f.parent}.${f.pk_col}\n`;
    }

    fs.writeFileSync("erd-schema.dbml", out);
    console.log(
      `Wrote erd-schema.dbml: ${tables.length} tables, ${fks.length} refs. Paste it into dbdiagram.io.`,
    );
  } catch (err) {
    console.error("Failed:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();

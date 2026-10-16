const db = require("../config/db");

let schemaPromise;

const ensureTable = async () => {
  if (!schemaPromise) {
    schemaPromise = db.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        announcement_id INT NOT NULL AUTO_INCREMENT,
        title VARCHAR(180) NOT NULL,
        description TEXT NOT NULL,
        announcement_type VARCHAR(30) NOT NULL DEFAULT 'update',
        image_url VARCHAR(2048) DEFAULT NULL,
        local_path VARCHAR(2048) DEFAULT NULL,
        is_published TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (announcement_id),
        KEY idx_announcements_published (is_published, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
};

const Announcement = {
  getAll: async (publishedOnly = false) => {
    await ensureTable();
    const sql = `SELECT * FROM announcements${publishedOnly ? " WHERE is_published = 1" : ""} ORDER BY created_at DESC, announcement_id DESC`;
    const [rows] = await db.query(sql);
    return rows;
  },

  create: async (data) => {
    await ensureTable();
    const [result] = await db.execute(
      `INSERT INTO announcements
        (title, description, announcement_type, image_url, local_path, is_published)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.description,
        data.announcement_type,
        data.image_url,
        data.local_path,
        data.is_published,
      ],
    );
    return result.insertId;
  },

  update: async (id, data) => {
    await ensureTable();
    let sql = `UPDATE announcements
      SET title = ?, description = ?, announcement_type = ?, is_published = ?`;
    const values = [
      data.title,
      data.description,
      data.announcement_type,
      data.is_published,
    ];
    if (data.remove_image) {
      sql += ", image_url = NULL, local_path = NULL";
    } else if (data.image_url) {
      sql += ", image_url = ?, local_path = ?";
      values.push(data.image_url, data.local_path);
    }
    sql += " WHERE announcement_id = ?";
    values.push(id);
    const [result] = await db.execute(sql, values);
    return result.affectedRows > 0;
  },

  delete: async (id) => {
    await ensureTable();
    const [result] = await db.execute(
      "DELETE FROM announcements WHERE announcement_id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },
};

module.exports = Announcement;

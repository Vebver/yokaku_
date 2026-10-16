const db = require("../config/db");
const ANNOUNCEMENT_COLUMNS = `
  announcement_id,
  title,
  description,
  announcement_type,
  image_url,
  local_path,
  is_published,
  created_at,
  updated_at
`;

const Announcement = {
  getById: async (id) => {
    const [rows] = await db.execute(
      `SELECT ${ANNOUNCEMENT_COLUMNS}
       FROM announcements
       WHERE announcement_id = ?`,
      [id],
    );
    return rows[0] || null;
  },

  getAll: async (publishedOnly = false) => {
    const sql = `SELECT ${ANNOUNCEMENT_COLUMNS}
      FROM announcements${publishedOnly ? " WHERE is_published = ?" : ""}
      ORDER BY created_at DESC, announcement_id DESC`;
    const [rows] = await db.execute(sql, publishedOnly ? [1] : []);
    return rows;
  },

  create: async (data) => {
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
    const [result] = await db.execute(
      "DELETE FROM announcements WHERE announcement_id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },
};

module.exports = Announcement;

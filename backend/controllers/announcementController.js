const cloudinary = require("cloudinary").v2;
const Announcement = require("../models/Announcement");
const Notification = require("../models/Notification");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET,
});

const parsePublished = (value) => value === true || value === "true" || Number(value) === 1;

const getImagePaths = async (file) => {
  if (!file) return { image_url: null, local_path: null };
  let cloudinaryUrl = null;
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: "restaurant_announcements",
    });
    cloudinaryUrl = result.secure_url;
  } catch (error) {
    console.error("Announcement Cloudinary upload error:", error.message);
  }
  return {
    image_url: `/uploads/${file.filename}`,
    local_path: cloudinaryUrl,
  };
};

const validateContent = (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const announcementType = String(req.body.announcement_type || "update");
  const allowedTypes = new Set(["promo", "menu", "event", "update"]);
  if (!title || !description) {
    res.status(400).json({ error: "Title and description are required." });
    return null;
  }
  if (title.length > 180 || !allowedTypes.has(announcementType)) {
    res.status(400).json({ error: "Please provide a valid title and announcement type." });
    return null;
  }
  return {
    title,
    description,
    announcement_type: announcementType,
    is_published: parsePublished(req.body.is_published) ? 1 : 0,
  };
};

const notifyCustomers = async ({
  title,
  description,
  announcement_type,
  image_url,
  local_path,
}) => {
  try {
    await Notification.createForCustomers(null, {
      title: "New announcement",
      message: `${title}\n\n${description}`,
      type: "promo",
      announcement: {
        title,
        description,
        announcement_type,
        image_url: local_path || image_url || null,
      },
    });
  } catch (error) {
    console.error("Announcement customer notification error:", error);
  }
};

const announcementController = {
  getPublished: async (_req, res) => {
    try {
      res.json(await Announcement.getAll(true));
    } catch (error) {
      console.error("Published announcements error:", error);
      res.status(500).json({ error: "Failed to load announcements." });
    }
  },

  getAll: async (_req, res) => {
    try {
      res.json(await Announcement.getAll(false));
    } catch (error) {
      console.error("Announcements error:", error);
      res.status(500).json({ error: "Failed to load announcements." });
    }
  },

  create: async (req, res) => {
    try {
      const content = validateContent(req, res);
      if (!content) return;
      const images = await getImagePaths(req.file);
      const id = await Announcement.create({ ...content, ...images });
      if (content.is_published) await notifyCustomers({ ...content, ...images });
      res.status(201).json({ success: true, id });
    } catch (error) {
      console.error("Create announcement error:", error);
      res.status(500).json({ error: "Failed to create announcement." });
    }
  },

  update: async (req, res) => {
    try {
      const content = validateContent(req, res);
      if (!content) return;
      const existing = await Announcement.getById(req.params.id);
      if (!existing) return res.status(404).json({ error: "Announcement not found." });
      const images = await getImagePaths(req.file);
      const notificationImages = req.body.remove_image === "true"
        ? { image_url: null, local_path: null }
        : images.image_url
          ? images
          : { image_url: existing.image_url, local_path: existing.local_path };
      const updated = await Announcement.update(req.params.id, {
        ...content,
        ...images,
        remove_image: req.body.remove_image === "true",
      });
      if (!updated) return res.status(404).json({ error: "Announcement not found." });
      if (content.is_published && !Number(existing.is_published)) {
        await notifyCustomers({ ...content, ...notificationImages });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Update announcement error:", error);
      res.status(500).json({ error: "Failed to update announcement." });
    }
  },

  delete: async (req, res) => {
    try {
      const deleted = await Announcement.delete(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Announcement not found." });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete announcement error:", error);
      res.status(500).json({ error: "Failed to delete announcement." });
    }
  },
};

module.exports = announcementController;

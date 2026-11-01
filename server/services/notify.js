const Notification = require('../models/Notification');

/**
 * Creates a single in-app notification safely without blocking the caller.
 */
const notifyUser = async ({ recipient, type, message, link }) => {
  try {
    if (!recipient) return null;
    return await Notification.create({
      recipient,
      type,
      message,
      link: link || '/dashboard'
    });
  } catch (error) {
    console.warn('⚠️ Non-fatal notification error:', error.message);
    return null;
  }
};

/**
 * Creates bulk in-app notifications (e.g. for all students in a department & semester).
 * Per NFR-NTF-02: Notifications for a whole semester are created with one bulk insert.
 */
const notifyMany = async (recipients, { type, message, link }) => {
  try {
    if (!recipients || recipients.length === 0) return [];
    const docs = recipients.map(rId => ({
      recipient: rId,
      type,
      message,
      link: link || '/dashboard'
    }));
    return await Notification.insertMany(docs, { ordered: false });
  } catch (error) {
    console.warn('⚠️ Non-fatal bulk notification error:', error.message);
    return [];
  }
};

module.exports = {
  notifyUser,
  notifyMany
};

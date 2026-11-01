const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// @route   GET /api/notifications
// @desc    List own notifications, newest first (FR-NTF-11, FR-NTF-12)
// @access  Protected
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ notifications });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ message: 'Error retrieving notifications.' });
  }
});

// @route   GET /api/notifications/unread-count
// @desc    Lightweight unread count for bell icon (NFR-NTF-01)
// @access  Protected
router.get('/unread-count', auth, async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ message: 'Error retrieving unread count.' });
  }
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark one notification as read (FR-NTF-11)
// @access  Protected
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.json({ message: 'Notification marked as read.', notification });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ message: 'Error marking notification as read.' });
  }
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all own notifications as read (FR-NTF-11)
// @access  Protected
router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    res.status(500).json({ message: 'Error marking all notifications as read.' });
  }
});

module.exports = router;

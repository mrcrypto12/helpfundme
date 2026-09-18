import { Response } from 'express';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

// @desc    Get user's notifications
// @route   GET /api/notifications
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = { recipient: req.user?._id };
    if (req.query.unread === 'true') {
      filter.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('relatedPost', 'title images')
        .populate('relatedUser', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: req.user?._id, isRead: false }),
    ]);

    res.json({
      notifications,
      unreadCount,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user?._id,
      isRead: false,
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching unread count' });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user?._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification' });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
export const markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await Notification.updateMany(
      { recipient: req.user?._id, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications' });
  }
};

// @desc    Delete a notification
// @route   DELETE /api/notifications/:id
export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user?._id,
    });

    if (!notification) {
      res.status(404).json({ message: 'Notification not found' });
      return;
    }

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notification' });
  }
};

const announcementService = require('../services/announcementService');
const AppError = require('../utils/AppError');

exports.createAnnouncement = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const announcement = await announcementService.createAnnouncement(courseId, req.body, req.user.id);
    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.getAnnouncements = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    const announcements = await announcementService.getAnnouncements(courseId, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    res.json({ success: true, data: announcements });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.getAnnouncement = async (req, res, next) => {
  try {
    const { announcementId } = req.params;
    const announcement = await announcementService.getAnnouncement(announcementId);
    res.json({ success: true, data: announcement });
  } catch (error) {
    next(new AppError(error.message, 404));
  }
};

exports.updateAnnouncement = async (req, res, next) => {
  try {
    const { announcementId } = req.params;
    const announcement = await announcementService.updateAnnouncement(announcementId, req.body);
    res.json({ success: true, data: announcement });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const { announcementId } = req.params;
    await announcementService.deleteAnnouncement(announcementId);
    res.json({ success: true, message: 'Announcement deleted' });
  } catch (error) {
    next(new AppError(error.message, 404));
  }
};

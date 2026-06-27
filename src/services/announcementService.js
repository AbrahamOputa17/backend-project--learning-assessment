const AnnouncementModel = require('../models/Announcement');
const NotificationModel = require('../models/Notification');

class AnnouncementService {
  /**
   * Create announcement
   */
  async createAnnouncement(courseId, data, userId) {
    if (!data.title || !data.content) {
      throw new Error('Title and content are required');
    }

    const announcement = await AnnouncementModel.create({
      courseId,
      title: data.title,
      content: data.content,
      createdBy: userId,
      scheduledAt: data.scheduledAt,
      expiresAt: data.expiresAt
    });

    // Notify all students immediately if not scheduled
    if (!data.scheduledAt) {
      await NotificationModel.notifyStudents({
        courseId,
        type: 'announcement',
        title: `New Announcement: ${data.title}`,
        content: data.content.substring(0, 150),
        excludeUserId: userId
      });
    }

    return announcement;
  }

  /**
   * Get course announcements
   */
  async getAnnouncements(courseId, { limit = 20, offset = 0 } = {}) {
    return AnnouncementModel.findByCourse(courseId, { limit, offset });
  }

  /**
   * Get announcement
   */
  async getAnnouncement(announcementId) {
    const announcement = await AnnouncementModel.findById(announcementId);
    if (!announcement) {
      throw new Error('Announcement not found');
    }
    return announcement;
  }

  /**
   * Update announcement
   */
  async updateAnnouncement(announcementId, data) {
    const announcement = await AnnouncementModel.findById(announcementId);
    if (!announcement) {
      throw new Error('Announcement not found');
    }

    return AnnouncementModel.update(announcementId, {
      title: data.title,
      content: data.content,
      scheduledAt: data.scheduledAt,
      expiresAt: data.expiresAt
    });
  }

  /**
   * Delete announcement
   */
  async deleteAnnouncement(announcementId) {
    await AnnouncementModel.delete(announcementId);
  }
}

module.exports = new AnnouncementService();

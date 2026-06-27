const DiscussionForumModel = require('../models/DiscussionForum');
const NotificationModel = require('../models/Notification');

class ForumService {
  /**
   * Create a forum for a course
   */
  async createForum(courseId, data, userId) {
    if (!data.title) {
      throw new Error('Forum title is required');
    }

    return DiscussionForumModel.create({
      courseId,
      title: data.title,
      description: data.description,
      createdBy: userId
    });
  }

  /**
   * Get all forums in a course
   */
  async getForums(courseId) {
    return DiscussionForumModel.findByCourse(courseId);
  }

  /**
   * Create a thread
   */
  async createThread(forumId, data, userId) {
    if (!data.title || !data.content) {
      throw new Error('Title and content are required');
    }

    const forum = await DiscussionForumModel.findById(forumId);
    if (!forum) {
      throw new Error('Forum not found');
    }

    const thread = await DiscussionForumModel.createThread({
      forumId,
      title: data.title,
      content: data.content,
      createdBy: userId
    });

    // Notify instructors and other participants
    await NotificationModel.notifyStudents({
      courseId: forum.course_id,
      type: 'forum_thread',
      title: `New forum thread: ${data.title}`,
      content: `${user.name} posted a new thread in ${forum.title}`,
      excludeUserId: userId
    });

    return thread;
  }

  /**
   * Get thread with replies
   */
  async getThreadWithReplies(threadId) {
    return DiscussionForumModel.findThreadWithReplies(threadId);
  }

  /**
   * Add reply to thread
   */
  async addReply(threadId, data, userId, userName) {
    if (!data.content) {
      throw new Error('Reply content is required');
    }

    const thread = await DiscussionForumModel.findThreadWithReplies(threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    const reply = await DiscussionForumModel.addReply({
      threadId,
      content: data.content,
      createdBy: userId
    });

    // Notify thread creator
    if (thread.created_by !== userId) {
      await NotificationModel.create({
        userId: thread.created_by,
        type: 'forum_reply',
        title: `New reply to: ${thread.title}`,
        content: `${userName} replied to your thread`,
        relatedId: threadId
      });
    }

    return reply;
  }

  /**
   * Mark as best answer
   */
  async markBestAnswer(replyId) {
    return DiscussionForumModel.markBestAnswer(replyId);
  }

  /**
   * Delete thread
   */
  async deleteThread(threadId) {
    await DiscussionForumModel.deleteThread(threadId);
  }

  /**
   * Delete reply
   */
  async deleteReply(replyId) {
    await DiscussionForumModel.deleteReply(replyId);
  }
}

module.exports = new ForumService();

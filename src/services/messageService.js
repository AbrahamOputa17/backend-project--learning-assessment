const MessageModel = require('../models/Message');

class MessageService {
  /**
   * Send message
   */
  async sendMessage(senderId, data) {
    if (!data.recipientId || !data.content) {
      throw new Error('Recipient and content are required');
    }

    return MessageModel.create({
      senderId,
      recipientId: data.recipientId,
      subject: data.subject,
      content: data.content
    });
  }

  /**
   * Get inbox
   */
  async getInbox(userId, { limit = 20, offset = 0 } = {}) {
    return MessageModel.findInbox(userId, { limit, offset });
  }

  /**
   * Get sent messages
   */
  async getSent(userId, { limit = 20, offset = 0 } = {}) {
    return MessageModel.findSent(userId, { limit, offset });
  }

  /**
   * Get message with attachments
   */
  async getMessage(messageId) {
    const message = await MessageModel.findByIdWithAttachments(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    // Mark as read
    if (!message.is_read) {
      await MessageModel.markAsRead(messageId);
    }

    return message;
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    return MessageModel.getUnreadCount(userId);
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId) {
    await MessageModel.delete(messageId);
  }
}

module.exports = new MessageService();

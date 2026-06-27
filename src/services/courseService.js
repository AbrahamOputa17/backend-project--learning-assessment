const CourseModel = require('../models/Course');
const AppError = require('../utils/AppError');

const CourseService = {
  async getAllCourses(filters) {
    return CourseModel.findAll(filters);
  },

  async getCourseById(id) {
    const course = await CourseModel.findById(id);
    if (!course) throw new AppError('Course not found', 404);
    return course;
  },

  async getInstructorCourses(instructorId) {
    return CourseModel.findByInstructor(instructorId);
  },

  async getSupervisedCourses(hodId) {
    return CourseModel.findBySupervisor(hodId);
  },

  async createCourse(user, data) {
    if (user.role === 'hod') {
      throw new AppError('Heads of Department cannot create courses. Only Instructors can.', 403);
    }
    return CourseModel.create({ ...data, instructorId: user.id });
  },

  async updateCourse(id, user, data) {
    const course = await CourseModel.findById(id);
    if (!course) throw new AppError('Course not found', 404);
    
    // Allow if owner, or if HOD supervisor, or if admin
    const isOwner = course.instructor_id === user.id;
    const isSupervisor = user.role === 'hod' && await CourseModel.isSupervisedBy(id, user.id);
    
    if (!isOwner && !isSupervisor && user.role !== 'admin') {
      throw new AppError('Not authorized to update this course', 403);
    }
    return CourseModel.update(id, data);
  },

  async deleteCourse(id, user) {
    const course = await CourseModel.findById(id);
    if (!course) throw new AppError('Course not found', 404);
    
    if (course.instructor_id !== user.id && user.role !== 'admin') {
      throw new AppError('Not authorized to delete this course', 403);
    }
    await CourseModel.delete(id);
  },

  async enrollStudent(userId, courseId) {
    const course = await CourseModel.findById(courseId);
    if (!course) throw new AppError('Course not found', 404);
    if (!course.is_published) throw new AppError('Course is not available for enrollment', 400);

    const result = await CourseModel.enroll(userId, courseId);
    return result || { message: 'Already enrolled' };
  },

  async getEnrolledCourses(userId) {
    return CourseModel.findEnrolled(userId);
  },
};

module.exports = CourseService;

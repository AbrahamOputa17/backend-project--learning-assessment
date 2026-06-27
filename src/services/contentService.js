const CourseModuleModel = require('../models/CourseModule');
const CourseMaterialModel = require('../models/CourseMaterial');

class ContentService {
  /**
   * Create a module for a course
   */
  async createModule(courseId, data) {
    if (!data.title) {
      throw new Error('Module title is required');
    }
    return CourseModuleModel.create({
      courseId,
      title: data.title,
      description: data.description
    });
  }

  /**
   * Get all modules in a course
   */
  async getModules(courseId) {
    return CourseModuleModel.findByCourse(courseId);
  }

  /**
   * Get module with materials
   */
  async getModuleWithMaterials(moduleId) {
    const module = await CourseModuleModel.findById(moduleId);
    if (!module) {
      throw new Error('Module not found');
    }

    const materials = await CourseMaterialModel.findByModule(moduleId);
    return {
      ...module,
      materials
    };
  }

  /**
   * Upload material to module
   */
  async uploadMaterial(moduleId, data, userId) {
    if (!data.title || !data.fileUrl || !data.fileName || !data.fileType) {
      throw new Error('Title, file URL, file name, and file type are required');
    }

    const module = await CourseModuleModel.findById(moduleId);
    if (!module) {
      throw new Error('Module not found');
    }

    return CourseMaterialModel.create({
      moduleId,
      title: data.title,
      description: data.description,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      createdBy: userId
    });
  }

  /**
   * Update material (creates version)
   */
  async updateMaterial(materialId, data, userId) {
    const material = await CourseMaterialModel.findById(materialId);
    if (!material) {
      throw new Error('Material not found');
    }

    return CourseMaterialModel.update(materialId, {
      title: data.title,
      description: data.description,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
      createdBy: userId,
      changeReason: data.changeReason
    });
  }

  /**
   * Get version history
   */
  async getMaterialVersions(materialId) {
    return CourseMaterialModel.getVersionHistory(materialId);
  }

  /**
   * Delete material
   */
  async deleteMaterial(materialId) {
    const material = await CourseMaterialModel.findById(materialId);
    if (!material) {
      throw new Error('Material not found');
    }
    await CourseMaterialModel.delete(materialId);
  }
}

module.exports = new ContentService();

const contentService = require('../services/contentService');
const AppError = require('../utils/AppError');

exports.createModule = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const module = await contentService.createModule(courseId, req.body);
    res.status(201).json({ success: true, data: module });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.getModules = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const modules = await contentService.getModules(courseId);
    res.json({ success: true, data: modules });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.getModuleWithMaterials = async (req, res, next) => {
  try {
    const { moduleId } = req.params;
    const module = await contentService.getModuleWithMaterials(moduleId);
    res.json({ success: true, data: module });
  } catch (error) {
    next(new AppError(error.message, 404));
  }
};

exports.uploadMaterial = async (req, res, next) => {
  try {
    const { moduleId } = req.params;
    const material = await contentService.uploadMaterial(moduleId, req.body, req.user.id);
    res.status(201).json({ success: true, data: material });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.updateMaterial = async (req, res, next) => {
  try {
    const { materialId } = req.params;
    const material = await contentService.updateMaterial(materialId, req.body, req.user.id);
    res.json({ success: true, data: material });
  } catch (error) {
    next(new AppError(error.message, 400));
  }
};

exports.getMaterialVersions = async (req, res, next) => {
  try {
    const { materialId } = req.params;
    const versions = await contentService.getMaterialVersions(materialId);
    res.json({ success: true, data: versions });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

exports.deleteMaterial = async (req, res, next) => {
  try {
    const { materialId } = req.params;
    await contentService.deleteMaterial(materialId);
    res.json({ success: true, message: 'Material deleted' });
  } catch (error) {
    next(new AppError(error.message, 404));
  }
};

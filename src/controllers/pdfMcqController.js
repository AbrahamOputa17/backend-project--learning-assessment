const PdfMcqService = require('../services/pdfMcqService');

const PdfMcqController = {
  async generate(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No PDF file uploaded' });
      }
      const questionCount = parseInt(req.body.questionCount, 10) || 5;
      const questions = await PdfMcqService.generateMcqFromPdf(req.file.buffer, questionCount);
      res.json({ status: 'success', data: { questions } });
    } catch (err) {
      next(err);
    }
  },

  async generateOutline(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No PDF file uploaded' });
      }
      
      const outline = await PdfMcqService.generateCourseOutline(req.file.buffer);
      
      // Save file for later lesson generation
      const fs = require('fs');
      const path = require('path');
      const fileName = `course_${Date.now()}.pdf`;
      const uploadDir = path.join(__dirname, '../../public/uploads/courses');
      
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(uploadDir, fileName), req.file.buffer);
      const pdfUrl = `/uploads/courses/${fileName}`;

      res.json({ status: 'success', data: { outline, pdfUrl } });
    } catch (err) {
      next(err);
    }
  },

  async generateCoding(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ status: 'error', message: 'No PDF file uploaded' });
      }
      const question = await PdfMcqService.generateCodingQuestion(req.file.buffer);
      res.json({ status: 'success', data: { question } });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = PdfMcqController;

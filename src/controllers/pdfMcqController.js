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
      
      // Instead of writing to the read-only local filesystem on Vercel,
      // represent the PDF as a base64 Data URL which fits completely in a postgreSQL TEXT field.
      const base64Pdf = req.file.buffer.toString('base64');
      const pdfUrl = `data:application/pdf;base64,${base64Pdf}`;

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

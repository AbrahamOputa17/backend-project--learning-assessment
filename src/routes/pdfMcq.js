const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const PdfMcqController = require('../controllers/pdfMcqController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// POST /api/pdf-mcq/generate  — upload PDF → get AI-generated MCQs
router.post(
  '/generate',
  authenticate,
  upload.single('pdf'),
  PdfMcqController.generate
);

// POST /api/pdf-mcq/generate-outline — upload PDF → get AI-generated Course Outline
router.post(
  '/generate-outline',
  authenticate,
  upload.single('pdf'),
  PdfMcqController.generateOutline
);

// POST /api/pdf-mcq/generate-coding — upload PDF → get AI-generated Coding Challenge
router.post(
  '/generate-coding',
  authenticate,
  upload.single('pdf'),
  PdfMcqController.generateCoding
);

module.exports = router;

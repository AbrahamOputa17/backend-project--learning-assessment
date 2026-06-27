const express = require('express');
const router = express.Router();

const { getModules, createModule } = require('../controllers/contentController');

router.get('/', getModules);
router.post('/', createModule);

module.exports = router;

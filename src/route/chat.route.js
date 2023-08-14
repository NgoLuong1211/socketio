const express = require('express');
const router = express.Router();
const {
    message
} = require('../controllers/chat.controller')

router.get('/message', message);


module.exports = router;
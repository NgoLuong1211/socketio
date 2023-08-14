const express = require('express');
const router = express.Router();
const {
    login,
    register,
    accountverification
} = require('../controllers/account.controller')

router.get('/', login);
router.get('/register', register);
router.post('/login', accountverification);



module.exports = router;
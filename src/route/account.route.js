const express = require('express');
const router = express.Router();
const {
    login,
    register,
    accountverification,
    registerverifi
} = require('../controllers/account.controller')

router.get('/', login);
router.get('/register', register);
router.post('/login', accountverification);
router.post('/register', registerverifi)



module.exports = router;
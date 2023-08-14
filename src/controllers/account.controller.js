const _user = require('../models/user.model')
const multer = require('multer');

var that = module.exports = {
    login: async(req, res) => {
        res.render('login')
    },
    register: async(req, res) => {
        res.render('register')
    },
    accountverification: async(req, res) => {
        const {
            account,
            password
        } = req.body;

        const user = await _user.findOne({account: account, password: password})
        if(!user){
            return res.json('tài khoản mật khẩu không chính xác!!!!')
        }
        res.cookie('user', user)
        return res.redirect('/chat/message')
    }
}
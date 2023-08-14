


var that = module.exports = {
    message: async(req, res) => {
        const user = req.cookies.user;
        res.render('home', {user: user._id});
    }
}
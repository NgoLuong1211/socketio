const account = require('./account.route')
const chat = require('./chat.route')

function route(app) {
    app.use('/chat', chat);
    app.use('/', account);
}

module.exports = route;
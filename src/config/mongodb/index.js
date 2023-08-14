const mongoose = require('mongoose')

async function connect() {
    try{
        await mongoose.connect('mongodb://127.0.0.1/socketio'), {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }
        console.log('Đã kết nối thành công đến MongoDB')
    }
    catch (error){
        console.log('Không thể kết nối đến MongoDB:', error)
    }
}

module.exports = { connect }
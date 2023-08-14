const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const users = new Schema({
    account: {type: String },
    password: { type: String },
    name: { type: String },
    socketId: { type: String },
    is_online: { type: Boolean },
    avatar: { type: String }
  }, {
    timestamps: true,
});

module.exports =  mongoose.model('user', users);
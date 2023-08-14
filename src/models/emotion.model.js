const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const emotions = new Schema({
    user_id: {
        type: String,
        ref: 'user'
    },
    message_id: {
        type: String,
        ref: 'message'
    },
    emotion: { type: String }
  }, {
    timestamps: true,
});

module.exports =  mongoose.model('emotion', emotions);
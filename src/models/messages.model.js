const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const messages = new Schema({
    sender_id: { 
        type: String,
        ref: 'user'
    },
    receiver_id: {
        type: String,
        ref: 'user'
    },
    group_id: {
        type: String,
        ref: 'group'
    },
    messages_content: { type: String },
    file_name: { type: String },
    file_path: { type: String },
  }, {
    timestamps: true,
});

module.exports =  mongoose.model('message', messages);
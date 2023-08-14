const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const friends = new Schema({
    sender_id: { 
        type: String,
        ref: 'user'
    },
    receiver_id: {
        type: String,
        ref: 'user'
    },
    status: { type: String }
  }, {
    timestamps: true,
});

module.exports =  mongoose.model('friend', friends);
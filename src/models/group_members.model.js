const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const group_members = new Schema({
    group_id: { 
        type: String,
        ref: 'group'
    },
    user_id: {
        type: String,
        ref: 'user'
    },
    permission: { type: String },
    is_online: { type: Boolean }
  }, {
    timestamps: true,
});

module.exports =  mongoose.model('group_member', group_members);
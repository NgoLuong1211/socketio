const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const groups = new Schema({
    name: { type: String },
    has_online_bool: { type: Boolean }
  }, {
    timestamps: true,
});

module.exports =  mongoose.model('group', groups);
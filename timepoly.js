var mongoose = require('mongoose'),
  mongoose_auth = require('mongoose-auth'),
  Schema = mongoose.Schema;

var TimePolySchema = new Schema({
  ll: { type: [Number], index: '2d' },
  start: Number,
  end: Number,
  name: String,
  address: String,
  points: Array,
  src: String,
  height: Number
});

var TimePoly = mongoose.model('TimePoly', TimePolySchema);

exports.TimePoly = TimePoly;
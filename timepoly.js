var mongoose = require('mongoose'),
  mongoose_auth = require('mongoose-auth'),
  Schema = mongoose.Schema;

var TimePolySchema = new Schema({
  ll: { type: [Number], index: '2d' },
  start: Date,
  end: Date,
  address: String,
  points: Array,
  src: String
});

var TimePoly = mongoose.model('TimePoly', TimePolySchema);

exports.TimePoly = TimePoly;
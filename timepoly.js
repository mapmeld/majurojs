var mongoose = require('mongoose'),
  mongoose_auth = require('mongoose-auth'),
  Schema = mongoose.Schema;

var TimePolySchema = new Schema({
  ll: { type: [Number], index: '2d' },
  start: Number,
  end: Number,
  points: Array
});

var TimePoly = mongoose.model('TimePoly', TimePolySchema);

exports.TimePoly = TimePoly;
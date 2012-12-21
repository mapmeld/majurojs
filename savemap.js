var mongoose = require('mongoose'),
  mongoose_auth = require('mongoose-auth'),
  Schema = mongoose.Schema;

var SaveMapSchema = new Schema({
  customgeo: String, // id of the CustomGeo used to collect buildings
  edited: Array // list of building ids, names, details, colors if a building was edited
});

var SaveMap = mongoose.model('SaveMap', SaveMapSchema);

exports.SaveMap = SaveMap;
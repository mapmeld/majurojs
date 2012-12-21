var mongoose = require('mongoose'),
  mongoose_auth = require('mongoose-auth'),
  Schema = mongoose.Schema;

var RegionSchema = new Schema({
  name: String, // allegheny
  fullname: String, // Allegheny County, PA
  images: Array, // [ background_image, gov_logo_image ] 
  districts: Array, // list of { name: Name, geo: customgeo_id } -- pre-render maps?
  datarules: String // HTML of known open data policies
});

var Region = mongoose.model('Region', RegionSchema);

exports.Region = Region;
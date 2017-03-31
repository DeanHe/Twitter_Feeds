var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var twitterSchema = new Schema({
    text: String,
    timestamp_ms: String,
    user: {
        name: String,
        screen_name: String,
        profile_image_url: String
    } 
});
module.exports = mongoose.model('TwitterModel', twitterSchema);
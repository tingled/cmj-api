var express = require('express');
var mongoose = require('mongoose');
var Schema = mongoose.Schema
var _ = require('lodash');

var showSchema = new Schema({
  'genre1' : String,
  'genre2' : String,
  'genre3' : String,
  'name' : String,
  'popularity' : String,
  'origin' : String,
  'mood' : String,
  'event_type' : String,
  'name' : String,
  'venue' : String,
  'speakers' : String,
  'description' : String,
  'sponsors' : String,
  'moderators' : String,
  'artist_uri' : String,
  'lat' : Number,
  'lng' : Number
});
var shows = mongoose.model('shows', showSchema);

app = express();
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

var connect = function() {
  var host = 'localhost';
  connstring = "mongodb://" + host + "/cmj";
  mongoose.connect(connstring);
};

app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
  response.render(__dirname + '/home');
});

app.get('/shows', function(request, response) {
  var criteria = request.query;
  criteria.event_type = 'S';
  var venues = {};

  connect();
  shows.find(criteria, function(err, items) {
    _.forEach(items, function(item) {
      if (!venues[item.venue]) {
        // Venue meta
        venues[item.venue] = { 
          name : item.venue,
          lat : item.lat,
          lng : item.lng,
          shows : []
        };
      };

      venues[item.venue]
    });

    response.json({
      venues : venues
    });
    mongoose.connection.close();
  });
});

var port = 80;
app.listen(port);
console.log("Listening on port " + port);

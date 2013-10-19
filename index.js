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

var trackSchema = new Schema({
  'tracks' : [String],
  'id': String
});

var shows = mongoose.model('shows', showSchema);
var tracks = mongoose.model('tracks',trackSchema);

app = express();
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

var connect = function() {
  var host = 'localhost';
  connstring = "mongodb://" + host + "/cmj";
  mongoose.connect(connstring);
};

var showToTracks = function(show, cb){
  mongoID = 'artist:'+show.name;
  tracks.findById(mongoID, function(err, trackList) {
    cb(trackList)
  })
};

app.use(express.static(__dirname + '/public'));

app.get('/', function(request, response) {
  response.render(__dirname + '/home');
});

app.get('/playlist',function(request,response) {
  connect();

  trackList = [];
  var criteria=request.query;
  criteria.event_type = 'S';

  cnt = 0
  shows.find(criteria, function(err, items) {
    num = items.length;
    if (num == 0){
      response.json({
        tracks: trackList
      });
      mongoose.connection.close();
    }
    _.forEach(items,function(show){
      tracks.find({'id':'artist:'+show.name},function(err,tl){
        cnt++;
        tcnt = 0;

        if ( tl[0] == undefined){
          if (cnt==items.length ){
            response.json({
              tracks: trackList
            });
            mongoose.connection.close();
          };

          tl[0]={};
          tl[0].tracks =[];
        }

        _.forEach(tl[0].tracks,function(track){
          tcnt++;
          trackList.push(track);
          if (cnt==items.length && tcnt == tl[0].tracks.length){
            response.json({
              tracks: trackList
            });
            mongoose.connection.close();
          };
        });

      });
    });
  });
});


app.get('/shows', function(request, response) {
  var criteria = request.query;
  criteria.event_type = 'S';
  var venues = {};

  connect();
  shows.find(criteria, function(err, items) {
    cnt = 0;
    _.forEach(items, function(item) {
      if (!venues[item.venue]) {
        // Venue meta
        venues[item.venue] = { 
          name : item.venue,
          lat : item.lat,
          lng : item.lng,
          shows : [],
          tracks : []
        };
      };
      venues[item.venue].shows.push(item);
    });
      //console.log(items.length);

      _.forEach(items,function(show){
        //console.log(show.name);
        console.log(items.length);
        tracks.find({'id':'artist:'+show.name},function(err,tl){
          console.log('.');
          tcnt = 0;

          if ( tl[0] == undefined){
            cnt++;
            console.log(cnt);
            if (cnt==items.length ){
              response.json({
                venues : venues
              });
              mongoose.connection.close();
            };

            tl[0]={};
            tl[0].tracks =[];
          }

          _.forEach(tl[0].tracks,function(track){
            tcnt++;
            venues[show.venue].tracks.push(track);
            if (cnt==items.length && tcnt == tl[0].tracks.length){
              response.json({
                venues :venues
              });
              mongoose.connection.close();
            };
          });
            cnt++;
            console.log(cnt);
        });
      });
    });
  });

app.get('/showsbk', function(request, response) {
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

      venues[item.venue].shows.push(item);
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

var map = L.mapbox.map('map', 'derektingle.map-07s27o18');

// disable drag and zoom handlers
/*
map.dragging.disable();
map.touchZoom.disable();
*/
/*
map.doubleClickZoom.disable();
map.scrollWheelZoom.disable();
*/

$(function() {

  $('#genreFilter').change(function(evt) {
    var genre = evt.target.value;
    getShows({ genre1: genre });
  });

  $('#dateFilter').change(function(evt) {
    var date = evt.target.value;
    getShows({ date : date });
  });

  var showsHTML = function(shows) {
    var snippet = "<table class='venueTable'>";
    _.forEach(shows, function(show) {
      snippet += "<tr>";
      snippet += "<td>" + show.name + "</td>";
      snippet += "<td>" + moment(show.start_time).format('ddd h:mm a') + "</td>";
      snippet += "</tr>";
    });
    snippet += "</table>"
    return snippet;
  }
  var addVenue = function(venue) {
    var markerLayer = L.mapbox.markerLayer({
      // this feature is in the GeoJSON format: see geojson.org
      // for the full specification
      type: 'Feature',
      geometry: {
        type: 'Point',
        // coordinates here are in longitude, latitude order because
        // x, y is the standard for GeoJSON and many formats
        coordinates: [venue.lng, venue.lat]
      },
      properties: {
        title: venue.name,
        description: venue.name,
        popup : showsHTML(venue.shows),
        tracks : venue.tracks,
        // one can customize markers by adding simplestyle properties
        // http://mapbox.com/developers/simplestyle/
        'marker-size': 'medium',
        'marker-color': '#ff0000'
      }
    }).addTo(map);

    markerLayer.eachLayer(function(layer) {
      var html = "<div>";
      html = "<strong>" + layer.feature.properties.title + "</strong>";
      var link = "<a href='http://embed.spotify.com/?uri=spotify:trackset:name:" + layer.feature.properties.tracks.join(',') + "'>Playlist</a>";
      console.log(link);
      html += link;
      html += layer.feature.properties.popup;
      html += "</div>";
      layer.bindPopup(html);
    });
  };

  var getShows = function(criteria) {
    var url = '/shows'; 
    if (criteria) {
      url += '?' + $.param(criteria);
    }
    $.get(url, function(data) {
      _.forEach(data.venues, function(venue) {
        addVenue(venue);
      });
    });
  }


});

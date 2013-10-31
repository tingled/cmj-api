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
  var allLayers = []

  $('#genreFilter').change(function(evt) {
    getShows();
  });

  $('#dateFilter').change(function(evt) {
    var date = $('#dateFilter').val();
    var genre = $('#genreFilter').val();
    var criteria = {};
    if (date) {
      criteria.date = date;
    }
    if (genre) {
      criteria.genre1 = genre;
    }
    getShows();
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
      var link = "<a class='venuePlaylist' target=_blank href='http://embed.spotify.com/?uri=spotify:trackset:" + layer.feature.properties.title +":" + layer.feature.properties.tracks.join(',') + "'>Playlist</a>";
      html += link;
      html += layer.feature.properties.popup;
      html += "</div>";
      layer.bindPopup(html);
    });

    allLayers.push(markerLayer);
  };

  var clearMarkers = function() {
    _.forEach(allLayers, function(layer) {
      layer.clearLayers();
      layer.eachLayer(function(l) {
        map.markerLayer.removeLayer(l);
      });
    });
  };

  var getShows = function() {
    clearMarkers();
    var date = $('#dateFilter').val();
    var genre = $('#genreFilter').val();
    var criteria = {};
    if (date) {
      criteria.date = date;
    }
    if (genre) {
      criteria.genre1 = genre;
    }
    var url = '/shows';
    if (criteria) {
      url += '?' + $.param(criteria);
    }
    console.log(url);
    $.get(url, function(data) {
      _.forEach(data.venues, function(venue) {
        addVenue(venue);
      });

    });
  }

  getShows();
});

var years = {},
  yearlist = [],
  year_links = [],
  set_time_period,
  map;

var city_options = {
  allegheny: {
    lat: 40.440676,
    lng: -79.984589,
    zoom: 14,
    time: false
  },
  austin: {
    lat: 30.312427,
    lng: -97.76018,
    zoom: 14,
    time: false
  },
  baltimore: {
    lat: 39.312564,
    lng: -76.61684,
    zoom: 14,
    time: false
  },
  boston: {
    lat: 42.358431,
    lng: -71.059773,
    zoom: 14,
    time: false
  },
  bloomington: {
    lat: 39.165325,
    lng: -86.526386,
    zoom: 14,
    time: false
  },
  chapelhill: {
    lat: 35.925661,
    lng: -79.032004,
    zoom: 14,
    time: false
  },
  chicago: {
    lat: 41.888476,
    lng: -87.624034,
    zoom: 14,
    time: true
  },
  clark: {
    lat: 39.924251,
    lng: -83.804479,
    zoom: 14,
    time: false
  },
  kitsap: {
    lat: 47.647661,
    lng: -122.641258,
    zoom: 14,
    time: false
  },
  lancaster: {
    lat: 40.011839,
    lng: -76.172333,
    zoom: 13,
    time: false
  },
  midland: {
    lat: 31.998308,
    lng: -102.083141,
    zoom: 14,
    time: true
  },
  nanaimo: {
    lat: 49.166,
    lng: -123.93519,
    zoom: 14,
    time: false
  },
  oakland: {
    lat: 37.795135,
    lng: -122.255173,
    zoom: 14,
    time: false
  },
  petaluma: {
    lat: 38.250729,
    lng: -122.634824,
    zoom: 14,
    time: false
  },
  philadelphia: {
    lat: 39.938435,
    lng: -75.136528,
    zoom: 14,
    time: false
  },
  raleigh: {
    lat: 35.825602,
    lng: -78.617236,
    zoom: 14,
    time: false
  },
  roundrock: {
    lat: 30.533027,
    lng: -97.686814,
    zoom: 14,
    time: false
  },
  sanfrancisco: {
    lat: 37.77493,
    lng: -122.419416,
    zoom: 14,
    time: false
  },
  savannah: {
    lat: 32.076175,
    lng: -81.095238,
    zoom: 14,
    time: false
  },
  seattle: {
    lat: 47.605237,
    lng: -122.325897,
    zoom: 14,
    time: false
  },
  smith: {
    lat: 32.336932,
    lng: -95.303603,
    zoom: 14,
    time: false
  },
  spokane: {
    lat: 47.65878,
    lng: -117.426047,
    zoom: 14,
    time: false
  },
  steamboatsprings: {
    lat: 40.458486,
    lng: -106.807356,
    zoom: 14,
    time: false
  },
  westsacramento: {
    lat: 38.578312,
    lng: -121.546635,
    zoom: 14,
    time: false
  }
};

var codeToTime = function(jstime){
  return (new Date(jstime)).getYear();
};

$(document).ready(function(){

  var timeline = document.getElementById('timeline'),
  controls = document.getElementById('controls');

  var minlat = 1000;
  var maxlat = -1000;
  var minlng = 1000;
  var maxlng = -1000;

  // create map with College Hill highlighted ( generalize in future versions )
  map = mapbox.map('map');
  map.addLayer(mapbox.layer().id('mapmeld.map-ofpv1ci4'));

  var markerLayer = mapbox.markers.layer()
    // start with all markers hidden
    .filter(function(f) { return false })
    .url('/timeline-at/' + customgeo + '.geojson', function(err, features) {
      // callback once GeoJSON is loaded

      set_time_period = function(y) {
        return function() {
          $("#mydate").html( codeToTime(y) );
          markerLayer.filter(function(f) {
            if(f.properties.start && f.properties.start > y){
              return false;
            }
            if(f.properties.end && f.properties.end < y){
              return false;
            }
            return true;
          });
          return false;
        };
      };

      var mintime = new Date("January 1, 3000") * 1;
      var maxtime = new Date("January 1, 1000") * 1;
      for (var i = 0; i < features.length; i++) {
        features[i].properties["marker-color"] = '#000';
        features[i].properties["marker-symbol"] = 'star-stroked';
        years[features[i].properties.year] = true;
        minlat = Math.min(minlat, features[i].geometry.coordinates[1]);
        maxlat = Math.max(maxlat, features[i].geometry.coordinates[1]);
        minlng = Math.min(minlng, features[i].geometry.coordinates[0]);
        maxlng = Math.max(maxlng, features[i].geometry.coordinates[0]);

        maxtime = Math.max(maxtime, features[i].properties.start);
        maxtime = Math.max(maxtime, features[i].properties.end);
        mintime = Math.min(mintime, features[i].properties.start);
        mintime = Math.min(mintime, features[i].properties.end);
      }
      map.setExtent(new MM.Extent(maxlat, minlng, minlat, maxlng));

      // set jQuery slider to min and max years
      $("#filter").slider({
        orientation: "horizontal",
        range: "min",
        min: mintime,
        max: maxtime,
        value: mintime,
        slide: function (event, ui) {
          set_time_period(ui.value)();
        }
      });

      for (var y in years) {
        yearlist.push(y);
      }
      yearlist.sort();
      for (var i = 0; i < yearlist.length; i++) {
        var a = timeline.appendChild(document.createElement('a'));
        a.innerHTML = codeToTime(yearlist[i]) + ' ';
        a.id = 'y' + yearlist[i];
        a.href = '#';
        a.onclick = set_time_period(yearlist[i]);
      }

      var play = controls.appendChild(document.createElement('a')),
        stop = controls.appendChild(document.createElement('a')),
        playStep;
    
      var myd = document.createElement("strong");
      myd.id = "mydate";
      myd.style.fontSize = "16pt";
      myd.style.marginLeft = "50px";
      myd.innerHTML = "1852";
      controls.appendChild( myd );
      $("#loading").css({ display: "none" });

      stop.innerHTML = '<a class="btn btn-inverse"><i class="icon-stop icon-white"></i> Stop</a>';
      play.innerHTML = '<a class="btn btn-success"><i class="icon-play-circle icon-white"></i> Play</a>';

      play.onclick = function() {
        var step = $("#filter").slider('value');
        // Every quarter-second (250 ms) increment the time period
        // When the end is reached, call clearInterval to stop the animation.
        playStep = window.setInterval(function() {
          if (step < $("#filter").slider('option', 'max')) {
            set_time_period(step)();
            $("#filter").slider('value', step);
            step++;
          }
          else {
            window.clearInterval(playStep);
          }
        }, 300);
      };

      stop.onclick = function() {
        window.clearInterval(playStep);
      };

      //set_time_period(1852)();
  });

  var interaction = mapbox.markers.interaction(markerLayer);
  interaction.formatter(function(feature) {
    var year = (new Date(feature.properties.start)).getYear();
    return feature.properties.address + "<br/>Built " + year;
  });
  map.addLayer(markerLayer);
  
  // generalize code to fit all markers
  if(src && city_options[ src ]){
    map.zoom(city_options[ src ].zoom).center({ lat: city_options[ src ].lat, lon: city_options[ src ].lng });  
  }
  else{
    map.zoom(15).center({ lat: 41.9308364983, lon: -87.6718342764 });
  }

});
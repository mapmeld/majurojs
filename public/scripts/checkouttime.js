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
  chicago: {
    lat: 41.888476,
    lng: -87.624034,
    zoom: 14,
    time: true
  },
  lancaster: {
    lat: 40.011839,
    lng: -76.172333,
    zoom: 14,
    time: false
  },
  oakland: {
    lat: 37.795135,
    lng: -122.255173,
    zoom: 14,
    time: false
  },
  philadelphia: {
    lat: 39.938435,
    lng: -75.136528,
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
  }
};

var codeToTime = function(jstime){
  return (new Date(jstime)).getYear();
};

function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}

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
    .url('/timeline-at.geojson?customgeo=' + getURLParameter("customgeo"), function(err, features) {
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
  var source = getURLParameter("src");
  if(src && city_options[ src ]){
    map.zoom(city_options[ source ].zoom).center({ lat: city_options[ source ].lat, lon: city_options[ source ].lng });  
  }
  else{
    map.zoom(15).center({ lat: 41.9308364983, lon: -87.6718342764 });
  }

});
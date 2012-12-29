var map, features, building_pop;

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

function codeToTime(jstime){
  return (new Date(jstime)).getYear();
};

function set_time_period(jstime){
  var y = codeToTime(jstime) * 1;
  $("#mydate").html( y );
  for(var f=0;f<features.length;f++){
    if(map.hasLayer(features[f])){
      if(f.properties.start && codeToTime( f.properties.start ) * 1 > y){
        map.removeLayer(features[f]);
        continue;
      }
      if(f.properties.end && codeToTime( f.properties.end ) * 1 < y){
        map.removeLayer(features[f]);
        continue;
      }
    }
    else{
      if((!f.properties.start || codeToTime( f.properties.start ) * 1 <= y) && (!f.properties.end || codeToTime( f.properties.end ) * 1 >= y)){
        map.addLayer( features[f] );
      }
    }
  }
};

function bindDetails(poly, props){
  poly.on('mouseover', function(e){
    building_pop.setLatLng( poly.getBounds().getCenter() ).setContent( (feature.properties.address || feature.properties.name) + "<br/>Built " + (feature.properties.start || "") + "<br/>" + (describe(features.properties.description) || "") );
    map.openPopup(building_pop);
  });
};

function describe(description){
  if((typeof description == 'undefined') || (!description)){
    return "";
  }
  // allow link:http://example.com
  while(description.indexOf("link:") > -1){
    description = description.split("link:");
    if(description[1].indexOf(" ") > -1){
      description[1] = "<a href='" + description[1].split(" ")[0] + "'>" + description[1].split(" ")[0] + "</a> " + description[1].split(" ")[1];
    }
    else{
      description[1] = "<a href='" + description[1] + "'>" + description[1] + "</a>";
    }
    description = description.join("link:");
    description = description.replace("link:","");
  }
  // allow photo:http://example.com/image.jpg
  // or img:http://example.com/image.jpg
  // or pic:http://example.com/image.jpg
  description = replaceAll(description, "img:", "photo:");
  description = replaceAll(description, "pic:", "photo:");
  while(description.indexOf("photo:") > -1){
    description = description.split("photo:");
    if(description[1].indexOf(" ") > -1){
      description[1] = "<br/><img src='" + description[1].split(" ")[0] + "' width='250'/><br/>" + description[1].split(" ")[1];
    }
    else{
      description[1] = "<br/><img src='" + description[1] + "' width='250'/>";
    }
    description = description.join("photo:");
    description = description.replace("photo:","");
  }
  return description;
}

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

  // make a Leaflet map
  map = new L.Map('map', { zoomControl: false, panControl: false });
  map.attributionControl.setPrefix('');
  L.control.pan().addTo(map);
  L.control.zoom().addTo(map);
  var toner = 'http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png';
  var tonerAttrib = 'Map data &copy; 2012 OpenStreetMap contributors, Tiles &copy; 2012 Stamen Design';
  terrainLayer = new L.TileLayer(toner, {maxZoom: 18, attribution: tonerAttrib});
  map.addLayer(terrainLayer);
  
  // center map based on city or county source
  src = getURLParameter("src");
  if(src && city_options[ src ]){
    map.setView(new L.LatLng(city_options[ src ].lat, city_options[ src ].lng), city_options[ src ].zoom);  
  }
  else{
    map.setView(new L.LatLng(39.938435,-75.136528), 14);
  }

  $.getJSON('/timeline-at.geojson?customgeo=' + getURLParameter("customgeo"), function(timepolys){
    features = timepolys.features;
    building_pop = new L.Popup();
    
    // find geographic and temporal bounds
    var mintime = new Date("January 1, 3000") * 1;
    var maxtime = new Date("January 1, 1000") * 1;
    for(var i=0;i<features.length;i++){
      if(features[i].properties.start){
        maxtime = Math.max(maxtime, features[i].properties.start);
        mintime = Math.min(mintime, features[i].properties.start);
      }
      if(features[i].properties.end){
        maxtime = Math.max(maxtime, features[i].properties.end);
        mintime = Math.min(mintime, features[i].properties.end);
      }
      var coords = features[i].geometry.coordinates[0];
      for(var p=0;p<coords.length;p++){
        minlat = Math.min(minlat, coords[p][1]);
        maxlat = Math.max(maxlat, coords[p][1]);
        minlng = Math.min(minlng, coords[p][0]);
        maxlng = Math.max(maxlng, coords[p][0]);
        coords[p] = new L.LatLng( coords[1], coords[0] );
      }
      features[f].geometry = new L.polygon(coords, { weight: 2 });
      if(features[f].properties.fill){
        features[f].geometry.setStyle({ color: features[f].properties.fill, opacity: 0.65 });
      }
      bindDetails( features[f].geometry, features[f].properties );
      map.addLayer( features[f].geometry );
    }
    map.fitBounds( new L.LatLngBounds( new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng) ) );

    // set up the jQuery slider
    $("#filter").slider({
      orientation: "horizontal",
      range: "min",
      min: mintime,
      max: maxtime,
      value: mintime,
      slide: function (event, ui) {
        set_time_period(ui.value);
      }
    });

    var play = controls.appendChild(document.createElement('a'));
    var stop = controls.appendChild(document.createElement('a'));
    var playStep;

    var myd = document.createElement("strong");
    myd.id = "mydate";
    myd.style.fontSize = "16pt";
    myd.style.marginLeft = "50px";
    myd.innerHTML = codeToTime( mintime );
    controls.appendChild( myd );
    $("#loading").css({ display: "none" });
    
    play.innerHTML = '<a class="btn btn-success"><i class="icon-play-circle icon-white"></i> Play</a>';
    play.onclick = function(){
      var step = codeToTime( $("#filter").slider('value') );
      // Every quarter-second (250 ms) increment the time period
      // When the end is reached, call clearInterval to stop the animation.
      playStep = window.setInterval(function() {
        if (step * 1 < codeToTime( $("#filter").slider('option', 'max') ) * 1) {
          set_time_period( 1 * (new Date("January 1, " + step)) );
          $("#filter").slider('value', 1 * (new Date("January 1, " + step)));
          step++;
        }
        else {
          window.clearInterval(playStep);
        }
      }, 300);
    };

    stop.innerHTML = '<a class="btn btn-inverse"><i class="icon-stop icon-white"></i> Stop</a>';
    stop.onclick = function(){
      window.clearInterval(playStep);
    };
    
    set_time_period( mintime );

  });

});
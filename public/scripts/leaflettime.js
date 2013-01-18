var map, features, building_pop;

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
  midlandtx: {
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
    lat: 37.810055,
    lng: -122.263648,
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

function codeToTime(jstime){
  return (new Date(jstime)).getFullYear();
}

function set_time_period(jstime){
  var y = codeToTime(jstime) * 1;
  $("#mydate").html( y );
  for(var f=0;f<features.length;f++){
    if(!features[f].geometry){
      continue;
    }
    if(map.hasLayer(features[f].geometry)){
      if(typeof features[f].properties.start != 'undefined' && codeToTime( features[f].properties.start ) * 1 > y){
        map.removeLayer(features[f].geometry);
        continue;
      }
      if(typeof features[f].properties.end != 'undefined' && codeToTime( features[f].properties.end ) * 1 < y){
        map.removeLayer(features[f].geometry);
        continue;
      }
    }
    else{
      if((typeof features[f].properties.start == 'undefined' || codeToTime( features[f].properties.start ) * 1 <= y) && (typeof features[f].properties.end == 'undefined' || codeToTime( features[f].properties.end ) * 1 >= y)){
        map.addLayer( features[f].geometry );
      }
    }
  }
}

function bindDetails(poly, props){
  poly.on('mouseover', function(e){
    var contentStr = "";
    if(props.address || props.name){
      contentStr += (props.address || props.name) + "<br/>";
    }
    if(typeof props.start != "undefined"){
      contentStr += "Built " + codeToTime(props.start) + "<br/>";
    }
    if(props.description){
      contentStr += describe(props.description);
    }
    building_pop.setLatLng( poly.getBounds().getCenter() ).setContent( contentStr );
    map.openPopup(building_pop);
  });
}

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
  var tonerAttrib = 'Map data &copy;2013 OpenStreetMap contributors, Tiles &copy;2013 Stamen Design';
  terrainLayer = new L.TileLayer(toner, {maxZoom: 18, attribution: tonerAttrib});
  map.addLayer(terrainLayer);
  
  // center map based on city or county source
  if(src && city_options[ src ]){
    map.setView(new L.LatLng(city_options[ src ].lat, city_options[ src ].lng), city_options[ src ].zoom);  
  }
  else{
    map.setView(new L.LatLng(39.938435,-75.136528), 14);
  }

  $.getJSON('/timeline-at/' + customgeo, function(timepolys){
    var src = timepolys.source;
    var src_credits = "";
    switch(src){
      case "allegheny":
      case "pittsburgh":
        src_credits = ".allegheny";
        break;
      case "austin":
        src_credits = ".austin";
        break;
      case "baltimore":
        src_credits = ".baltimore";
        break;
      case "bloomington":
        src_credits = ".bloomington";
        break;
      case "boston":
        src_credits = ".boston";
        break;
      case "boulder":
        src_credits = ".boulder";
        break;
      case "chapelhill":
        src_credits = ".chapelhill";
        break;
      case "chicago":
        src_credits = ".chicago";
        break;
      case "clark":
        src_credits = ".clark";
        break;
      case "kitsap":
        src_credits = ".kitsap";
        break;
      case "lancaster":
        src_credits = ".lancaster";
        break;
      case "midland":
      case "midlandtx":
        src_credits = ".midland";
        break;
      case "nanaimo":
        src_credits = ".nanaimo";
        break;
      case "oakland":
        src_credits = ".oakland";
        break;
      case "petaluma":
        src_credits = ".petaluma";
        break;
      case "philadelphia":
        src_credits = ".philadelphia";
        break;
      case "raleigh":
      case "wake":
        src_credits = ".raleigh";
        break;
      case "roundrock":
        src_credits = ".roundrock";
        break;
      case "sanfrancisco":
        src_credits = ".sanfrancisco";
        break;
      case "savannah":
      case "chatham":
      case "sagis":
        src_credits = ".savannah";
        break;
      case "seattle":
        src_credits = ".seattle";
        break;
      case "smith":
      case "tyler":
        src_credits = ".smith";
        break;
      case "spokane":
        src_credits = ".spokane";
        break;
      case "steamboatsprings":
        src_credits = ".steamboatsprings";
        break;
      case "westsacramento":
        src_credits = ".westsacramento";
        break;
    }
    $(src_credits).css({ "display": "inline" });
    if(src_credits.length){
      $("#createyours").attr("href", "/draw/" + src_credits.replace(".",""));
    }

    features = timepolys.features;
    building_pop = new L.Popup();
    
    // find geographic and temporal bounds
    var mintime = new Date("January 1, 3000") * 1;
    var maxtime = new Date("January 1, 1000") * 1;
    for(var i=0;i<features.length;i++){
      // don't show features without time information
      if((typeof features[i].properties.start == 'undefined') && (typeof features[i].properties.end == 'undefined')){
        features[i].geometry = null;
        continue;
      }
      if(typeof features[i].properties.start != 'undefined'){
        maxtime = Math.max(maxtime, features[i].properties.start);
        mintime = Math.min(mintime, features[i].properties.start);
      }
      if(typeof features[i].properties.end != 'undefined'){
        maxtime = Math.max(maxtime, features[i].properties.end);
        mintime = Math.min(mintime, features[i].properties.end);
      }
      var coords = features[i].geometry.coordinates[0];
      for(var p=0;p<coords.length;p++){
        minlat = Math.min(minlat, coords[p][1]);
        maxlat = Math.max(maxlat, coords[p][1]);
        minlng = Math.min(minlng, coords[p][0]);
        maxlng = Math.max(maxlng, coords[p][0]);
        coords[p] = new L.LatLng( coords[p][1], coords[p][0] );
      }
      features[i].geometry = new L.polygon(coords, { weight: 2 });
      if(features[i].properties.fill){
        features[i].geometry.setStyle({ color: features[i].properties.fill, opacity: 0.65 });
      }
      bindDetails( features[i].geometry, features[i].properties );
      //map.addLayer( features[i].geometry );
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
        if(playStep){
          window.clearInterval(playStep);
          playStep = null;
        }
        set_time_period(ui.value);
      }
    });

    var play = controls.appendChild(document.createElement('a'));
    var stop = controls.appendChild(document.createElement('a'));
    var playStep = null;

    var myd = document.createElement("strong");
    myd.id = "mydate";
    myd.style.fontSize = "16pt";
    myd.style.marginLeft = "50px";
    myd.innerHTML = codeToTime( mintime );
    controls.appendChild( myd );
    $("#loading").css({ display: "none" });
    
    play.innerHTML = '<i class="icon-play-circle icon-white"></i> Play';
    play.className = "btn btn-success";
    play.onclick = function(){
      if(playStep){ return; }
      var step = codeToTime( $("#filter").slider('value') ) * 1;
      // Every quarter-second (300 ms) increment the time period
      // When the end is reached, call clearInterval to stop the animation.
      playStep = window.setInterval(function() {
        if (step * 1 <= codeToTime( $("#filter").slider('option', 'max') ) * 1) {
          set_time_period( 1 * (new Date("January 1, " + step)) );
          $("#filter").slider('value', 1 * (new Date("January 1, " + step)));
          step++;
        }
        else {
          window.clearInterval(playStep);
          playStep = null;
        }
      }, 300);
    };

    stop.className = 'btn btn-inverse';
    stop.innerHTML = '<i class="icon-stop icon-white"></i> Stop';
    stop.onclick = function(){
      window.clearInterval(playStep);
      playStep = null;
    };
    
    set_time_period( mintime );

  });
});

function zoomByAbout(e) {
  var x = .5*$('#map').width(),
  y = .5*$('#map').height(),
  mouse_point = e.containerPoint,
  new_center_point = new L.Point((x + mouse_point.x) / 2, (y + mouse_point.y) / 2),
  new_center_location = map.containerPointToLatLng(new_center_point);
  map.setView(new_center_location, map.getZoom() + 1); 
}

function showDataSource(){
  $("#creditmessage").modal("toggle");
}
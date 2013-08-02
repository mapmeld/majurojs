var map;

$(document).ready(function(){
  // make a Leaflet map
  map = new L.Map('map', { zoomControl: false, panControl: false });
  map.attributionControl.setPrefix('');
  L.control.pan().addTo(map);
  L.control.zoom().addTo(map);
  var toner = 'http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png';
  var tonerAttrib = 'Map data &copy; 2013 OpenStreetMap contributors, Tiles by Stamen Design';
  terrainLayer = new L.TileLayer(toner, {maxZoom: 18, attribution: tonerAttrib});
  map.addLayer(terrainLayer);
  map.setView(new L.LatLng(32.076175,-81.095238), 10);

  // load building geo from static JSON file (Github Pages)
  $.getJSON('mybuild.geojson', loadedPolys);
});

function zoomByAbout(e) {
  var x = .5*$('#map').width(),
  y = .5*$('#map').height(),
  mouse_point = e.containerPoint,
  new_center_point = new L.Point((x + mouse_point.x) / 2, (y + mouse_point.y) / 2),
  new_center_location = map.containerPointToLatLng(new_center_point);	           
  map.setView(new_center_location, map.getZoom() + 1);
}

function loadedPolys(polys){
  var src = polys.source;
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
    case "honolulu":
      src_credits = ".honolulu";
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
    case "nyc":
      src_credits = ".nyc";
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
  $(src_credits).css({ "display": "block" });

  //console.log(polys);
  var maxlat = -90;
  var minlat = 90;
  var maxlng = -180;
  var minlng = 180;
  var includedColors = [];
  for(var f=0;f<polys.features.length;f++){
    var coords = polys.features[f].geometry.coordinates[0];
    for(var c=0;c<coords.length;c++){
      maxlat = Math.max(maxlat, coords[c][1]);
      minlat = Math.min(minlat, coords[c][1]);
      maxlng = Math.max(maxlng, coords[c][0]);
      minlng = Math.min(minlng, coords[c][0]);
      coords[c] = new L.LatLng(coords[c][1], coords[c][0]);
    }
    var polyfill = (polys.features[f].properties.fill || "#0033ff");
    //console.log(polyfill);
    var poly = new L.polygon(coords, { weight: 2, color: polyfill });
    if(polys.features[f].properties.name || polys.features[f].properties.description){
      poly.bindPopup( ('<h3>' + polys.features[f].properties.name + '</h3>' || '') + describe( polys.features[f].properties.description ) );
    }
    else{
      poly.setStyle({ clickable: false });
    }
    map.addLayer(poly);
    if(ShowMapKey && !ShowUnusedColors){
      switch(polyfill){
        case "#0000ff":
        case "#0033ff":
        case "#00f":
        case "blue":
          if(includedColors.indexOf("blue") == -1){
            includedColors.push("blue");
          }
          break;
        case "#ff0000":
        case "#f00":
        case "red":
          if(includedColors.indexOf("red") == -1){
            includedColors.push("red");
          }
          break;
        case "#00ff00":
        case "#0f0":
        case "green":
          if(includedColors.indexOf("green") == -1){
            includedColors.push("green");
          }
          break;
        case "#ffa500":
        case "orange":
          if(includedColors.indexOf("orange") == -1){
            includedColors.push("orange");
          }
          break;
      }
    }
  }
  // re-center map
  if(polys.features.length){
    map.fitBounds( new L.LatLngBounds( new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng) ) );
  }
  // load key, if requested
  if(ShowMapKey){
    var key = document.createElement('div');
    key.className = 'mapkey';
    var keyContent = "<h4>Map Key</h4><ul>";
    $.each(MapKey, function(color, label){
      // check if all colors should be included, or that this color was used, before adding it to the key
      if(!ShowUnusedColors && includedColors.indexOf(color) == -1){
        return;
      }
      // remove whitespace
      while(label.indexOf(" ") == 0){
        label = label.replace(" ","");
      }
      while(label.lastIndexOf(" ") == label.length - 1){
        label = label.substring(0, label.length - 1);
      }
      while(label.indexOf("	") == 0){
        label = label.replace("	","");
      }
      while(label.lastIndexOf("	") == label.length - 1){
        label = label.substring(0, label.length - 1);
      }
      keyContent += "<li><img src='images/" + color + "marker.png'/><span>" + label + "</span></li>";      
    });
    keyContent += "</ul>";
    key.innerHTML = keyContent;
    $("#sidebar").append(key);
  }
}
function replaceAll(src, oldr, newr){
  while(src.indexOf(oldr) > -1){
    src = src.replace(oldr, newr);
  }
  return src;
}
function describe(description){
  if((typeof description == 'undefined') || (!description)){
    return "";
  }
  description = replaceAll(description, "SETPIC:", "photo:");
  description = replaceAll(description, "SETVID:", "video:"); 
  
  // allow link:http://example.com
  while(description.indexOf("link:") > -1){
    description = description.split("link:");
    if(description[1].indexOf(" ") > -1){
      description[1] = "<a href='" + description[1].split(" ")[0] + "'>" + description[1].split(" ")[0] + "</a> " + description[1].split(" ").slice(1);
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
      description[1] = "<br/><img src='" + description[1].split(" ")[0] + "' width='250'/><br/>" + description[1].split(" ").slice(1);
    }
    else{
      description[1] = "<br/><img src='" + description[1] + "' width='250'/>";
    }
    description = description.join("photo:");
    description = description.replace("photo:","");
  }
  // allow video:http://youtube.com/watch?v=t4oYs1aTD-4
  while(description.indexOf("video:") > -1){
    description = description.split("video:");
    if(description[1].indexOf(" ") > -1){
      description[1] = "<br/><iframe title='YouTube video player' width='280' height='230' src='http://" + replaceAll(replaceAll(replaceAll(description[1].split(" ")[0], "http://",""), "https://", ""),"/watch?v=","/embed/") + "' frameborder='0' allowfullscreen></iframe><br/>" + description[1].split(" ").slice(1);
    }
    else{
      description[1] = "<br/><iframe title='YouTube video player' width='280' height='230' src='http://" + replaceAll(replaceAll(replaceAll(description[1], "http://",""), "https://", ""),"/watch?v=","/embed/") + "' frameborder='0' allowfullscreen></iframe>";
    }
    description = description.join("video:");
    description = description.replace("video:","");
  }
  return '<p>' + description + '</p>';
}
function showDataSource(){
  $("#creditmessage").modal("toggle");
}
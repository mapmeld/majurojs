var map, infowindow, buildings;

$(document).ready(function(){
  var mapOptions = {
    zoom: 8,
    center: new google.maps.LatLng(32.833, -83.647),
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    mapTypeControl: true
  };
  map = new google.maps.Map($('#map')[0], mapOptions);

  infowindow = new google.maps.InfoWindow({
    maxWidth: 300
  });
  
  $.getJSON('../mybuild.geojson', function(polys){
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
      var avglat = 0;
      var avglng = 0;
      for(var c=0;c<coords.length;c++){
        maxlat = Math.max(maxlat, coords[c][1]);
        minlat = Math.min(minlat, coords[c][1]);
        maxlng = Math.max(maxlng, coords[c][0]);
        minlng = Math.min(minlng, coords[c][0]);
        avglat += coords[c][1];
        avglng += coords[c][0];
        coords[c] = new google.maps.LatLng(coords[c][1], coords[c][0]);
      }
      avglat /= coords.length;
      avglng /= coords.length;
      var ctr = new google.maps.LatLng(avglat, avglng);
      var polyfill = (polys.features[f].properties.fill || "#0033ff");
      var poly;
      if(polys.features[f].properties.name || polys.features[f].properties.description){
        poly = new google.maps.Polygon({
          map: map,
          paths: [ coords ],
          strokeColor: polyfill,
          strokeOpacity: 0.5,
          fillColor: polyfill,
          fillOpacity: 0.3,
          clickable: true
        });
        bindPopup(poly, ctr, ('<h3>' + polys.features[f].properties.name + '</h3>' || ''), describe( polys.features[f].properties.description ) );
      }
      else{
        poly = new google.maps.Polygon({
          map: map,
          paths: [ coords ],
          strokeColor: polyfill,
          strokeOpacity: 0.5,
          fillColor: polyfill,
          fillOpacity: 0.3,
          clickable: false
        });
      }
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
    if(polys.features.length){
      map.fitBounds( new google.maps.LatLngBounds( new google.maps.LatLng(minlat, minlng), new google.maps.LatLng(maxlat, maxlng) ) );
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
  });
});
function bindPopup(shape, center, name, details){
  google.maps.event.addListener(shape, 'click', function(){
    infowindow.close();
    infowindow.setContent( "<strong>" + name + "</strong><br/>" + details );
    infowindow.setPosition(center);
    infowindow.open(map);
  });
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
  return description;
}
function replaceAll(src, oldr, newr){
  while(src.indexOf(oldr) > -1){
    src = src.replace(oldr, newr);
  }
  return src;
}
function showDataSource(){
  $("#creditmessage").modal("toggle");
}
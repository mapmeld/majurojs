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
      case "bloomington":
        src_credits = ".bloomington";
        break;
      case "boston":
        src_credits = ".boston";
        break;
      case "chicago":
        src_credits = ".chicago";
        break;
      case "kitsap":
        src_credits = ".kitsap";
        break;
      case "lancaster":
        src_credits = ".lancaster";
        break;
      case "oakland":
        src_credits = ".oakland";
        break;
      case "philadelphia":
        src_credits = ".philadelphia";
        break;
      case "savannah":
        src_credits = ".savannah";
        break;
      case "seattle":
        src_credits = ".seattle";
        break;
      case "spokane":
        src_credits = ".spokane";
        break;
    }
    $(src_credits).css({ "display": "block" });

    //console.log(polys);
    var maxlat = -90;
    var minlat = 90;
    var maxlng = -180;
    var minlng = 180;
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
      var poly = new google.maps.Polygon({
        map: map,
        paths: [ coords ],
        strokeColor: (polys.features[f].properties.fill || "#0000ff"),
        strokeOpacity: 0.5,
        fillColor: (polys.features[f].properties.fill || "#0000ff"),
        fillOpacity: 0.3
      });
      if(polys.features[f].properties.name || polys.features[f].properties.description){
        bindPopup(poly, ctr, ('<h3>' + polys.features[f].properties.name + '</h3>' || ''), describe( polys.features[f].properties.description ) );
      }
    }
    if(polys.features.length){
      map.fitBounds( new google.maps.LatLngBounds( new google.maps.LatLng(minlat, minlng), new google.maps.LatLng(maxlat, maxlng) ) );
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
function replaceAll(src, oldr, newr){
  while(src.indexOf(oldr) > -1){
    src = src.replace(oldr, newr);
  }
  return src;
}
function showDataSource(){
  $("#creditmessage").modal("toggle");
}
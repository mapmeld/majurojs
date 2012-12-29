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
  
  buildings = new google.maps.KmlLayer('../mybuild.geojson', { suppressInfoWindows: false, preserveViewport: false, map: map });
  
  /* buildings.on('featureclick', function(feature, latlng, pos, data){
    if(!data.name && !data.description){
      // no info was stored on this feature. No need for a popup.
      return;
    }
    infowindow.close();
    infowindow.setContent( "<strong>" + (data.name || data.id || "") + "</strong><br/>" + describe(data.description) );
    infowindow.setPosition( latlng );
    infowindow.open(map);
  }); */

});
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
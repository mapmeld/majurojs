var map, footprint;

$(document).ready(function(){
  // make a Leaflet map
  map = new L.Map('map', { zoomControl: false, panControl: false });
  map.attributionControl.setPrefix('');
  L.control.pan().addTo(map);
  L.control.zoom().addTo(map);
  var toner = 'http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png';
  var tonerAttrib = 'Map data &copy; 2012 OpenStreetMap contributors, Tiles &copy; 2012 Stamen Design';
  terrainLayer = new L.TileLayer(toner, {maxZoom: 18, attribution: tonerAttrib});
  map.addLayer(terrainLayer);
  map.setView(new L.LatLng(32.076175,-81.095238), 14);
  
  // add a sample neighborhood area and make it editable
  var wll = [ new L.LatLng(32.076175,-81.095238), new L.LatLng(32.074175,-81.095238), new L.LatLng(32.08175,-81.09) ];
  footprint = new L.Polygon( wll, { color: "#00f", fillOpacity: 0.3, opacity: 0.65 } );
  footprint.editing.enable();
  map.addLayer(footprint);

  // make a jQuery slider to view code enforcement case timeline
  $("#filter").slider({
    orientation: "horizontal",
    range: "min",
    min: 2000,
    max: 2185,
    value: 2000,
    slide: function (event, ui) {
      set_time_period(ui.value)();
    }
  });

});

function llserial(latlngs){
  var llstr = [ ];
  for(var i=0;i<latlngs.length;i++){
    llstr.push(latlngs[i].lat.toFixed(6) + "," + latlngs[i].lng.toFixed(6));
  }
  return llstr.join("|");
}

function postGeo(format){
  var poly = llserial(footprint.getLatLngs());
  $.post("/customgeo", { pts: poly }, function(data){
    if(format == "html"){
      window.location = "/timeline?customgeo=" + data.id;
    }
    else if(format == "geojson"){
      window.location = "/timeline-at.geojson?customgeo=" + data.id;
    }
    else if(format == "kml"){
      window.location = "/timeline-at.kml?customgeo=" + data.id;
    }
  });
}
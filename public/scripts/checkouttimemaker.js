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
  map.setView(new L.LatLng(39.938435,-75.136528), 14);
  
  // add a sample neighborhood area and make it editable
  var wll = [ new L.LatLng(39.935539, -75.156698), new L.LatLng(39.934618,-75.144081), new L.LatLng(39.941923,-75.150776) ];
  footprint = new L.Polygon( wll, { color: "#00f", fillOpacity: 0.3, opacity: 0.65 } );
  footprint.editing.enable();
  map.addLayer(footprint);
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
    else if(format == "3d"){
      var minlat = 90;
      var centerlng = 0;
      var pts = footprint.getLatLngs();
      for(var p=0;p<pts.length;p++){
        minlat = Math.min( minlat, pts[p].lat );
        centerlng += pts[p].lng;
      }
      centerlng /= pts.length;
      window.location = "/explore3d?customgeo=" + data.id + "&lat=" + minlat.toFixed(6) + "&lng=" + centerlng.toFixed(6);
    }
    else if(format == "geojson"){
      window.location = "/timeline-at.geojson?customgeo=" + data.id;
    }
    else if(format == "kml"){
      window.location = "/timeline-at.kml?customgeo=" + data.id;
    }
  });
}
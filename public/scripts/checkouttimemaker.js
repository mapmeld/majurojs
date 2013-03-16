var map, footprint;

var city_options = {
  pittsburgh: {
    lat: 40.440676,
    lng: -79.984589,
    zoom: 14,
    time: false
  },
  austin: {
    lat: 30.268926,
    lng: -97.746176,
    zoom: 14,
    time: false
  },
  baltimore: {
    lat: 39.278776,
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
    lat: 35.905181,
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
  honolulu: {
    lat: 21.345345,
    lng: -157.929196,
    zoom: 13,
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
    lat: 37.791065,
    lng: -122.404861,
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
    lat: 40.484037,
    lng: -106.825046,
    zoom: 12,
    time: false
  },
  westsacramento: {
    lat: 38.578312,
    lng: -121.546635,
    zoom: 14,
    time: false
  }
};

$(document).ready(function(){
  // let users change the source
  if( src ){
    $("#cityselect").val(src);
    $("#cityselect").change(function(e){
      window.location = "/draw/" + $("#cityselect").val();
    });
  }

  // make a Leaflet map
  map = new L.Map('map', { zoomControl: false, panControl: false });
  map.attributionControl.setPrefix('');
  L.control.pan().addTo(map);
  L.control.zoom().addTo(map);
  var toner = 'http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png';
  var tonerAttrib = 'Map data &copy;2013 OpenStreetMap contributors, Tiles &copy;2013 Stamen Design';
  terrainLayer = new L.TileLayer(toner, {maxZoom: 18, attribution: tonerAttrib});
  map.addLayer(terrainLayer);

  // set defaults for city
  var lat = 39.938435;
  var lng = -75.136528;
  var zoom = 14;

  if( src ){
    lat = city_options[ src ].lat;
    lng = city_options[ src ].lng;
    zoom = city_options[ src ].zoom;
    // add timeline option if available ( currently just Chicago )
    if( city_options[ src ].time ){
      $(".timeline").css({ "display": "inline" });
    }
  }

  // center on this city
  map.setView(new L.LatLng(lat,lng), zoom);  

  // add a sample neighborhood area and make it editable
  var wll = [ new L.LatLng(lat - 0.002896, lng - 0.02983), new L.LatLng(lat - 0.003817, lng + 0.022447), new L.LatLng(lat + 0.003508, lng - 0.026852) ];
  footprint = new L.Polygon( wll, { color: "#00f", fillOpacity: 0.3, opacity: 0.65 } );
  footprint.editing.enable();
  map.addLayer(footprint);
  
  // add a draggable marker to translate the shape
  lat -= 0.001;
  lng -= 0.004;

  var ctrIcon = new L.Icon({
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    shadowSize: [0, 0],
    iconUrl: "/images/4-way-arrow.png"
  });
  var ctrmrk = new L.marker(new L.LatLng(lat,lng), { draggable: true, icon: ctrIcon });
  ctrmrk.on('dragend', function(e){
    var latdiff = ctrmrk.getLatLng().lat - lat;
    var lngdiff = ctrmrk.getLatLng().lng - lng;
    var latlngs = footprint.getLatLngs();
    for(var pt=0;pt<latlngs.length;pt++){
      latlngs[pt] = new L.LatLng( latlngs[pt].lat + latdiff, latlngs[pt].lng + lngdiff );
    }
    map.removeLayer(footprint);
    footprint = new L.Polygon( latlngs, { color: "#00f", fillOpacity: 0.3, opacity: 0.65 } );
    footprint.editing.enable();
    map.addLayer(footprint);

    lat = ctrmrk.getLatLng().lat;
    lng = ctrmrk.getLatLng().lng;
    
    // re-center the center marker when editing occurs
    footprint.on('edit', function(e){
      var latlngs = footprint.getLatLngs();
      var avglat = 0;
      var avglng = 0;
      for(var pt=0;pt<latlngs.length;pt++){
        avglat += latlngs[pt].lat;
        avglng += latlngs[pt].lng;
      }
      lat = avglat / latlngs.length;
      lng = avglng / latlngs.length;
      ctrmrk.setLatLng(new L.LatLng(lat,lng));
    });
  });
  // re-center the center marker when editing occurs
  footprint.on('edit', function(e){
    var latlngs = footprint.getLatLngs();
    var avglat = 0;
    var avglng = 0;
    for(var pt=0;pt<latlngs.length;pt++){
      avglat += latlngs[pt].lat;
      avglng += latlngs[pt].lng;
    }
    lat = avglat / latlngs.length;
    lng = avglng / latlngs.length;
    ctrmrk.setLatLng(new L.LatLng(lat,lng));
  });
  map.addLayer(ctrmrk);
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
      if(src){
        window.location = "/build/" + src + "/" + data.id;
      }
      else{
        window.location = "/build/" + data.id;      
      }
    }
    else if(format == "time"){
      if(src){
        window.location = "/timeline/" + src + "/" + data.id;
      }
      else{
        window.location = "/timeline/" + data.id;      
      }
    }
    else if(format == "clusters"){
      if(src){
        window.location = "/timeclusters/" + src + "/" + data.id;
      }
      else{
        window.location = "/timeclusters/" + data.id;
      }
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
      if(src){
        window.location = "/explore3d/" + src + "/" + data.id;
      }
      else{
        window.location = "/explore3d/" + data.id;
      }
    }
    else if(format == "geojson"){
      if(src){
        window.location = "/timeline-at/" + src + "/" + data.id + ".geojson";
      }
      else{
        window.location = "/timeline-at/" + data.id + ".geojson";      
      }
    }
    else if(format == "kml"){
      if(src){
        window.location = "/timeline-at/" + src + "/" + data.id + ".kml";
      }
      else{
        window.location = "/timeline-at/" + data.id + ".kml";
      }
    }
  });
}

function zoomByAbout(e) {
  var x = .5*$('#map').width(),
  y = .5*$('#map').height(),
  mouse_point = e.containerPoint,
  new_center_point = new L.Point((x + mouse_point.x) / 2, (y + mouse_point.y) / 2),
  new_center_location = map.containerPointToLatLng(new_center_point);
  map.setView(new_center_location, map.getZoom() + 1); 
}
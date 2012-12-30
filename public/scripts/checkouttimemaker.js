var map, footprint;

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
    lng: -76.61684
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
  chicago: {
    lat: 41.888476,
    lng: -87.624034,
    zoom: 14,
    time: true
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
  nanaimo: {
    lat: 49.166,
    lng: -123.93519,
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
  spokane: {
    lat: 47.65878,
    lng: -117.426047,
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

  // set defaults for city
  var lat = 39.938435;
  var lng = -75.136528;
  var zoom = 14;

  if( getURLParameter("src") && city_options[ getURLParameter("src") ] ){
    lat = city_options[ getURLParameter("src") ].lat;
    lng = city_options[ getURLParameter("src") ].lng;
    zoom = city_options[ getURLParameter("src") ].zoom;
    // add timeline option if available ( currently just Chicago )
    if( city_options[ getURLParameter("src") ].time ){
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
      window.location = "/build?src=" + (getURLParameter("src") || "") + "&customgeo=" + data.id;
    }
    else if(format == "time"){
      window.location = "/timeline?src=" + (getURLParameter("src") || "") + "&customgeo=" + data.id;
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

function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}
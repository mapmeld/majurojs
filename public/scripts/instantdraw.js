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
  midland: {
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
    lat: 37.795135,
    lng: -122.255173,
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

$(document).ready(function(){
  var streets = new OpenLayers.Layer.XYZ("Stamen", [ "http://d.tile.stamen.com/toner/${z}/${x}/${y}.png" ], {
  });

  map = new OpenLayers.Map({
    div: "map",
    layers: [streets],
    center: [ -71, 42 ],
    zoom: 10
  });
  
  if( src ){
    lat = city_options[ src ].lat;
    lng = city_options[ src ].lng;
    zoom = city_options[ src ].zoom;

    // add timeline option if available ( currently just Chicago )
    if( city_options[ src ].time ){
      $(".timeline").css({ "display": "inline" });
    }
    var fromPrj = new OpenLayers.Projection("EPSG:4326");
    var toPrj = new OpenLayers.Projection("EPSG:900913");
    map.setCenter( new OpenLayers.LonLat( lng, lat ).transform(fromPrj, toPrj) );
  }

  var polygonLayer = new OpenLayers.Layer.Vector("Draw Bounds");
  map.addLayer( polygonLayer );
  polygonControl = new OpenLayers.Control.DrawFeature(polygonLayer, OpenLayers.Handler.Polygon);
  polygonControl.featureAdded = function(feature){
    drawnPolygon = feature;
    footprint = feature.geometry.getVertices();
  };
  map.addControl(polygonControl);
  polygonControl.activate();
});

function llserial(latlngs){
  var llstr = [ ];
  for(var i=0;i<latlngs.length;i++){
    var fromPrj = new OpenLayers.Projection("EPSG:4326");
    var toPrj = new OpenLayers.Projection("EPSG:900913");
    var ll = latlngs[i].transform(toPrj, fromPrj);
    llstr.push(ll.y.toFixed(6) + "," + ll.x.toFixed(6));
  }
  return llstr.join("|");
}

function postGeo(format){
  var poly = llserial( footprint );
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
    else if(format == "3d"){
      var minlat = 90;
      var centerlng = 0;
      var pts = footprint;
      for(var p=0;p<pts.length;p++){
        minlat = Math.min( minlat, pts[p].y );
        centerlng += pts[p].x;
      }
      centerlng /= pts.length;
      if(src){
        window.location = "/explore3d/" + src + "/" + data.id + "?lat=" + minlat.toFixed(6) + "&lng=" + centerlng.toFixed(6);
      }
      else{
        window.location = "/explore3d/" + data.id + "?lat=" + minlat.toFixed(6) + "&lng=" + centerlng.toFixed(6);
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
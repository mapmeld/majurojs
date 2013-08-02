$(document).ready(function(){
  // request building geo from Github Pages
  $.getJSON('../mybuild.geojson', loadedPolys); 
});
function loadedPolys(polys){
  // show the relevant city or county credit
  src = polys.source;
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
  
  // find center of map
  var ctrlat, ctrlng;
  if(getURLParameter("center")){
    ctrlat = getURLParameter("center").split(",")[0];
    ctrlng = getURLParameter("center").split(",")[1];
  }
  else{
    var maxlat = -90;
    var minlat = 90;
    var maxlng = -180;
    var minlng = 180;
    for(var f=0;f<polys.features.length;f++){
      var coords = polys.features[f].geometry.coordinates[0];
      for(var c=0;c<coords.length;c++){
        maxlat = Math.max(maxlat, coords[c][1]);
        minlat = Math.min(minlat, coords[c][1]);
        maxlng = Math.max(maxlng, coords[c][0]);
        minlng = Math.min(minlng, coords[c][0]);       
      }
    }
    ctrlat = (maxlat + minlat) / 2;
    ctrlng = (maxlng + minlng) / 2;
  }
  
  // find scale of logarithmic distances
  var minx, miny, maxx, maxy;
  for(var f=0;f<polys.features.length;f++){
    var coords = polys.features[f].geometry.coordinates[0];
    for(var c=0;c<coords.length;c++){
      var lat = coords[c][1];
      var lng = coords[c][0];
      
      var xdist = 1000000 * ctrlng - 1000000 * lng;
      var ydist = 1000000 * ctrlat - 1000000 * lat;
      var dist = Math.pow( Math.pow(xdist, 2) + Math.pow(ydist,2), 0.5 );
      dist = Math.log(dist);

      if(xdist == 0){
        xdist = 1;
      }
      var angle = Math.atan( Math.abs(ydist) / Math.abs(xdist) );
      
      // replot point using logarithmic distance and original angle
      if(xdist < 0){
        if(ydist < 0){
          xdist = Math.cos(angle) * dist * -1;
          ydist = Math.sin(angle) * dist * -1;
        }
        else{
          xdist = Math.cos(angle) * dist * -1;
          ydist = Math.sin(angle) * dist;
        }
      }
      else{
        if(ydist < 0){
          xdist = Math.cos(angle) * dist;
          ydist = Math.sin(angle) * dist * -1;
        }
        else{
          xdist = Math.cos(angle) * dist;
          ydist = Math.sin(angle) * dist; 
        }
      }
      
      polys.features[f].geometry.coordinates[0][c][0] = xdist;
      polys.features[f].geometry.coordinates[0][c][1] = ydist;
      
      if(maxx || minx || maxy || miny){
        maxx = Math.max( maxx, xdist );
        minx = Math.min( minx, xdist );
        maxy = Math.max( maxy, ydist );
        miny = Math.min( miny, ydist );
      }
      else{
        maxx = xdist;
        minx = xdist;
        maxy = ydist;
        miny = ydist;
      }
    }
  }
  var ydiff = maxy - miny;
  var xdiff = maxx - minx;
  var scale;
  if(xdiff > ydiff){
    scale = 1000 / xdiff;
  }
  else{
    scale = 1000 / ydiff;
  }
  var ctx = document.getElementById("build_canvas").getContext('2d');
  for(var f=0;f<polys.features.length;f++){
    var coords = polys.features[f].geometry.coordinates[0];
    var scaledy = parseInt((coords[0][1] - miny) * scale);
    var scaledx = parseInt((coords[0][0] - minx) * scale);
    ctx.moveTo(1000 - scaledx, scaledy);
    var usedcoords = [ scaledx + "," + scaledy ];
    for(var c=1;c<coords.length;c++){
      scaledy = parseInt((coords[c][1] - miny) * scale);
      scaledx = parseInt((coords[c][0] - minx) * scale);
      if(usedcoords.indexOf(scaledx + "," + scaledy) == -1){
        // new coordinate
        ctx.lineTo(1000 - scaledx, scaledy);
      }
    }
    if(usedcoords.length == 1){
      // didn't draw a polygon -- make it a square
      ctx.rect(1000 - scaledx - 1, scaledy - 1, 2, 2);
    }
    else{
      ctx.stroke();
    }
    ctx.fill();
  }
}
function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}
function shapeHoldsPt(poly, pt){
    for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
        ((poly[i].lat <= pt.lat && pt.lat < poly[j].lat) || (poly[j].lat <= pt.lat && pt.lat < poly[i].lat))
        && (pt.lng < (poly[j].lng - poly[i].lng) * (pt.lat - poly[i].lat) / (poly[j].lat - poly[i].lat) + poly[i].lng)
        && (c = !c);
    return c;
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
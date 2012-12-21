var map, dragtype, building_pop;
var footprints = [ ];
var edited = { };

function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}

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
  
  building_pop = new L.Popup();
  
  if(getURLParameter("customgeo") && getURLParameter("customgeo").length){
    // request building geo dynamically from server
    $.getJSON('/timeline-at.geojson?customgeo=' + getURLParameter("customgeo"), function(polys){

      // show the relevant city or county credit
      var src = polys.source;
      var src_credits = "";
      switch(src){
        case "allegheny":
        case "pittsburgh":
          src_credits = ".allegheny";
          break;
        case "chicago":
          src_credits = ".chicago";
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
      }
      $(src_credits).css({ "display": "block" });
    
      //console.log(polys);
      var maxlat = -90;
      var minlat = 90;
      var maxlng = -180;
      var minlng = 180;
      for(var f=0;f<polys.features.length;f++){
        var coords = polys.features[f].geometry.coordinates[0];
        var avg = [0, 0];
        for(var c=0;c<coords.length;c++){
          maxlat = Math.max(maxlat, coords[c][1]);
          minlat = Math.min(minlat, coords[c][1]);
          maxlng = Math.max(maxlng, coords[c][0]);
          minlng = Math.min(minlng, coords[c][0]);
          coords[c] = new L.LatLng(coords[c][1], coords[c][0]);
          avg[0] += coords[c][0];
          avg[1] += coords[c][1];          
        }
        avg[0] /= coords.length;
        avg[0] = avg[0].toFixed(6);
        avg[1] /= coords.length;
        avg[1] = avg[1].toFixed(6);

        var poly = new L.polygon(coords, { weight: 2 });
        map.addLayer(poly);
        footprints.push({ id: avg.join(',') + "," + coords.length, geo: poly, name: "", description: "" });
        addPolyEdit(footprints.length-1);
      }
      if(polys.features.length){
        map.fitBounds( new L.LatLngBounds( new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng) ) );
      }
    });
  }
});
function addPolyEdit(polyindex){
  //poly.bindPopup("<input type='hidden' id='selectedid' value='" + footprints.length + "'/><label>Name</label><br/><input id='poly_name' class='x-large' value=''/><br/><label>Add Detail</label><br/><textarea id='poly_detail' rows='6' cols='25'></textarea><br/><a class='btn' onclick='saveDetail()' style='width:40%;'>Save</a>");
  footprints[polyindex].geo.on('click', function(e){
    building_pop.setLatLng( footprints[polyindex].geo.getBounds().getCenter() ).setContent("<input type='hidden' id='selectedid' value='" + polyindex + "'/><label>Name</label><br/><input id='poly_name' class='x-large' value='" + replaceAll((footprints[polyindex].name || ""),"'","\\'") + "'/><br/><label>Add Detail</label><br/><textarea id='poly_detail' rows='6' cols='25'>" + replaceAll(replaceAll((footprints[polyindex].description || ""),"<","&lt;"),">","&gt;") + "</textarea><br/><a class='btn' onclick='saveDetail()' style='width:40%;'>Save</a>");
    map.openPopup(building_pop);
  });
}
function saveDetail(){
  // popup save
  var id = $('#selectedid').val() * 1;
  var name = $('#poly_name').val();
  var description = $('#poly_detail').val();
  footprints[ id ].name = name;
  footprints[ id ].description = description;
  if(edited[ footprints[ id ].id ]){
    // update entry
    edited[ footprints[ id ].id ].name = name;
    edited[ footprints[ id ].id ].detail = description;
  }
  else{
    // create entry
    edited[ footprints[ id ].id ] = {
      name: name
      detail: description
    };
  }
  map.closePopup();
}
function dragstarted(e){
  dragtype = e.target.id;
}
function allowDrop(e){
  e.preventDefault();
}
function dragended(e){
  e.target.style.opacity = "1";
  allowDrop(e);
}
function dropped(e){
  //console.log('dropped');
  //console.log(e);
  var dropPoint = map.containerPointToLatLng(
    new L.Point(
      e.pageX - $("#map").offset().left,
      e.pageY - $("#map").offset().top
    )
  );
  //console.log( dropPoint.lat + "," + dropPoint.lng );
  for(var p=0;p<footprints.length;p++){
    var poly = footprints[p].geo.getLatLngs();
    if(shapeHoldsPt( poly, dropPoint ) ){
      var setColor = "#0000ff";
      switch(dragtype){
        case "marker_Red":
          setColor = "#ff0000";
          footprints[p].color = "red";
          break;
        case "marker_Orange":
          setColor = "orange";
          footprints[p].color = "orange";
          break;
        case "marker_Green":
          setColor = "#00ff00";
          footprints[p].color = "green";
          break;
      }
      footprints[p].geo.setStyle({ color: setColor, opacity: 0.65 });
      if(edited[footprints[p].id]){
        // update entry
        edited[ footprints[ p ].id ].color = setColor;
      }
      else{
        // create entry
        edited[ footprints[ p ].id ] = { color: setColor };
      }
      break;
    }
  }
  allowDrop(e);
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
function downloadFile(format){
  var bb = new BlobBuilder();
  if(format == 1){ 
    // GeoJSON
    var geofeatures = [ ];
    for(var f=0;f<footprints.length;f++){
      // collect all points in polygon
      var geopoints = footprints[f].geo.getLatLngs();
      var mypts = [ ];
      for(var g=0;g<geopoints.length;g++){
        mypts.push( [ geopoints[g].lng, geopoints[g].lat ] );
      }
      // create a feature
      var geo = {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [ mypts ]
        },
        "properties": {
          "fill": footprints[f].geo.options.color,
          "name": footprints[f].name,
          "description": footprints[f].description
        }
      };
      geofeatures.push(geo);
    }
    // create a feature collection
    var geojson = { "type": "FeatureCollection", "features": geofeatures };
    // use BlobBuilder, FileSaver, and JSON.stringify to output
    bb.append( JSON.stringify( geojson ) );
    saveAs(bb.getBlob("application/json;charset=utf-8"), "mybuild.geojson");
  }
  else if(format == 0){ // KML
    bb.append('<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://earth.google.com/kml/2.2">\n	<Document>\n		<name>Savannah KML</name>\n			<description>Savannah Buildings Export</description>\n');
    bb.append('			<Style id="red_poly">\n				<LineStyle>\n					<color>ff0000ff</color>\n				</LineStyle>\n				<PolyStyle>\n					<color>880000ff</color>\n				</PolyStyle>\n			</Style>\n			<Style id="blue_poly">\n				<LineStyle>\n					<color>ffff0000</color>\n				</LineStyle>\n				<PolyStyle>\n					<color>88ff0000</color>\n				</PolyStyle>\n			</Style>\n			<Style id="green_poly">\n				<LineStyle>\n					<color>ff00ff00</color>\n				</LineStyle>\n				<PolyStyle>\n					<color>8800ff00</color>\n				</PolyStyle>\n			</Style>\n			<Style id="orange_poly">\n				<LineStyle>\n					<color>ff005aff</color>\n				</LineStyle>\n				<PolyStyle>\n					<color>88005aff</color>\n				</PolyStyle>\n			</Style>\n');
    for(var f=0;f<footprints.length;f++){
      // generate point string
      var geopoints = footprints[f].geo.getLatLngs();
      var mypts = [ ];
      for(var g=0;g<geopoints.length;g++){
        mypts.push( geopoints[g].lng + "," + geopoints[g].lat + ",0" );
      }
      mypts = mypts.join(" ");

      bb.append('	<Placemark>\n		<name>' + footprints[f].name + '</name>\n');
      bb.append('		<description><![CDATA[<div>' + describe(footprints[f].description) + '</div>]]></description>\n');
      bb.append('		<styleUrl>#' + (footprints[f].color || "blue") + '_poly</styleUrl>\n');
      bb.append('		<Polygon>\n			<tessellate>1</tessellate>\n			<outerBoundaryIs>\n				<LinearRing>\n');
      bb.append('					<coordinates>' + mypts + '</coordinates>\n');
      bb.append('				</LinearRing>\n			</outerBoundaryIs>\n		</Polygon>\n	</Placemark>\n');
    }
    bb.append('  </Document>\n</kml>');
    saveAs(bb.getBlob("application/kml;charset=utf-8"), "mybuild.kml");
  }
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
function saveMap(){
  var poly_id = getURLParameter("customgeo");
  var arredited = [];
  for(editShape in edited){
    arredited.push({
      id: edited[editShape].id
    });
    if(edited[editShape].color){
      arredited[ arredited.length-1 ].color = edited[editShape].color;
    }
    if(edited[editShape].name){
      arredited[ arredited.length-1 ].name = edited[editShape].name;
    }
    if(edited[editShape].detail){
      arredited[ arredited.length-1 ].detail = edited[editShape].detail;
    }
  }
  $.post("/savemap", { customgeo: poly_id, edited: JSON.stringify(arredited) }, function(data){
    window.location = "/savemap?id=" + data.savedid;
  });
}
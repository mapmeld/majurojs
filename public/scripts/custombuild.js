var map, cnv, pencilmark, dragtype, building_pop;
var footprints = [ ];
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
  // check for browser compatibility other than IE
  if((typeof $.browser.mozilla != "undefined") && ($.browser.mozilla) && (isNaN($.browser.version * 1) || ($.browser.version * 1 < 4))){
    // older version of Firefox
    IE_EDITOR = true;
    $(".exportmap").css({ "display": "none" });
    $(".dragdrop").css({ "display": "none" });    
  }
  if((typeof $.browser.safari != "undefined") && ($.browser.safari) && (isNaN($.browser.version * 1) || ($.browser.version * 1 < 5))){
    // older version of Safari (possibly Chrome)
    IE_EDITOR = true;
    $(".exportmap").css({ "display": "none" });
    $(".dragdrop").css({ "display": "none" });
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

  // center map based on city or county source
  if(src && city_options[ src ]){
    map.setView(new L.LatLng(city_options[ src ].lat, city_options[ src ].lng), city_options[ src ].zoom);  
  }
  else{
    map.setView(new L.LatLng(39.938435,-75.136528), 14);
  }

  // building popup
  building_pop = new L.Popup();

  // request building geo dynamically from server
  var polysurl = '/timeline-at';
  if(src){
    polysurl += '/' + src;
  }
  polysurl += '/' + customgeo;
    
  $.getJSON(polysurl, loadBuildings);

  // satellite maps unchecked by default
  $("#savemapsat")[0].checked = false;

  // remove scribble option if using IE_EDITOR
  if(typeof IE_EDITOR != "undefined" && IE_EDITOR){
    $("#pencil").css({ display: "none" });
    return;
  }
  
  // canvas for scribble / convex hull coloring
  cnv = document.createElement("canvas");
  $(".row-fluid").append(cnv);
  $(cnv).css({
    position: "absolute",
    left: "18%",
    width: "82%",
    height: "99%",
    top: "150%",
    cursor: "none",
    bottom: 0
  });
  var cnvdraw = false;
  var cnvpts = [];
  cnv.height = cnv.offsetHeight;
  cnv.width = cnv.offsetWidth;
  var ctx;
  
  var pencilIcon = new L.Icon({
    iconSize: [30, 30],
    iconAnchor: [0, 30],
    shadowSize: [0, 0],
    iconUrl: "/images/pencil.png"
  });
  pencilmark = new L.marker(new L.LatLng(0,0), {icon: pencilIcon});

  $(cnv).mousedown(function(e){
    cnvpts = [ ];
    cnvdraw = true;
    ctx = cnv.getContext('2d');
    ctx.strokeStyle = "#f00";
    ctx.strokeWidth = 2;
    ctx.moveTo(e.pageX - $("#map").offset().left, e.pageY - $("#map").offset().top);
  });

  $(cnv).mousemove(function(e){
    if(cnvdraw){
      var cnvpt = (e.pageX - $("#map").offset().left) + "," + (e.pageY - $("#map").offset().top);
      if(cnvpts.indexOf(cnvpt) == -1){
        ctx.lineTo(e.pageX - $("#map").offset().left, e.pageY - $("#map").offset().top);
        ctx.stroke();
        cnvpts.push(cnvpt);
      }
    }
    pencilmark.setLatLng( map.containerPointToLatLng(
      new L.Point(
        e.pageX - $("#map").offset().left,
        e.pageY - $("#map").offset().top
      )
    ));
  });
  $(cnv).mouseup(function(e){
    cnvdraw = false;
    map.removeLayer(pencilmark);
    var line = [ ];
    for(var pt=0;pt<cnvpts.length;pt++){
      line.push(map.containerPointToLatLng(
        new L.Point(
          cnvpts[pt].split(',')[0],
          cnvpts[pt].split(',')[1]
        )
      ));
    }
    var hull = getConvexHull(line);
    var hull2 = [];
    for(var pt=0;pt<hull.length;pt++){
      hull2.push(hull[pt][0]);
      hull2.push(hull[pt][1]);
    }
    //map.addLayer(new L.polygon(hull2));
    for(var p=0;p<footprints.length;p++){
      var poly = footprints[p].geo.getLatLngs();
      for(var d=0;d<poly.length;d++){
        if(shapeHoldsPt( hull2, poly[d] ) ){
          footprints[p].color = "#f00";
          footprints[p].geo.setStyle({ color: "#f00", opacity: 0.65, fillOpacity: 0.2 });
          break;
        }
      }
    }
    setTimeout(function(){
      $(cnv).css({ top: "150%" });
      cnv.width = cnv.width;
    }, 500);
  });
});

function loadBuildings(polys){
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
  for(var f=0;f<polys.features.length;f++){
    var coords = polys.features[f].geometry.coordinates[0];
    var avg = [0, 0];
    for(var c=0;c<coords.length;c++){
      maxlat = Math.max(maxlat, coords[c][1]);
      minlat = Math.min(minlat, coords[c][1]);
      maxlng = Math.max(maxlng, coords[c][0]);
      minlng = Math.min(minlng, coords[c][0]);
      avg[0] += coords[c][0];
      avg[1] += coords[c][1];  
      coords[c] = new L.LatLng(coords[c][1], coords[c][0]);        
    }
    avg[0] /= coords.length;
    avg[0] = avg[0].toFixed(6);
    avg[1] /= coords.length;
    avg[1] = avg[1].toFixed(6);

    var poly = new L.polygon(coords, { weight: 2 });
    map.addLayer(poly);
    var props = { };
    if(typeof polys.features[f].properties != 'undefined'){
      props = polys.features[f].properties;
    }
    footprints.push({ id: avg.join(',') + "," + coords.length, geo: poly, name: "", description: "", color: "", properties: props });
    addPolyEdit(footprints.length-1);
  }
  if(polys.features.length){
    map.fitBounds( new L.LatLngBounds( new L.LatLng(minlat, minlng), new L.LatLng(maxlat, maxlng) ) );
  }
}

function startPencil(){
  $(cnv).css({ top: 0 });
  map.addLayer(pencilmark);
}

function addPolyEdit(polyindex){
  footprints[polyindex].geo.on('click', function(e){
    building_pop.setLatLng( footprints[polyindex].geo.getBounds().getCenter() );
    
    var appendToEditor = "";
    
    if(typeof IE_EDITOR != "undefined" && IE_EDITOR){
      // old IE: need to add color selector
      var selcolor;
      if( footprints[polyindex].color ){
        selcolor = footprints[polyindex].geo.options.color;
      }
      else{
        selcolor = "#00f";
      }
      appendToEditor += "<select id='poly_color'>" + ("<option value='#f00'>red</option><option value='#ff5a00'>orange</option><option value='#0f0'>green</option><option value='#00f'>blue</option>").replace("value='" + selcolor + "'", "value='" + selcolor + "' selected='selected'") + "</select><br/>";
    }
    
    var build_id = "<input type='hidden' id='selectedid' value='" + polyindex + "'/><br/>";
    var build_name = "<input id='poly_name' class='x-large' value='" + replaceAll((footprints[polyindex].name || ""),"'","\\'") + "' placeholder='Name'/><br/>";
    var saveBtn = "<a class='btn' onclick='saveDetail()' style='width:40%;'>Save</a>";

    var build_detail_tabs = "<div class='navbar'><div class='nav'><li class='texttab'><a href='#' onclick='detailTab(0);'>Tt</a></li><li class='phototab'><a href='#' onclick='detailTab(1);'>Photo</a></li><li class='videotab'><a href='#' onclick='detailTab(2);'>Video</a></li></div></div><br/>";
    var detailInterface = "<div class='tabpane'>";
    if(footprints[polyindex].description.indexOf("SETPIC:") == 0){
      // embedded photo
      detailInterface += "<div class='phototabpane'><strong>Embed picture</strong><br/><input placeholder='Image URL' value='" + replaceAll(replaceAll(replaceAll((footprints[polyindex].description || ""),"<","&lt;"),">","&gt;"),"SETPIC:","") + "'/></div>";
      build_detail_tabs = build_detail_tabs.replace("phototab", "phototab active");
    }
    else if(footprints[polyindex].description.indexOf("SETVID:") == 0){
      // embedded video
      detailInterface += "<div class='videotabpane'><strong>Embed YouTube video</strong><br/><input placeholder='YouTube URL' value='" + replaceAll(replaceAll(replaceAll((footprints[polyindex].description || ""),"<","&lt;"),">","&gt;"),"SETVID:","") + "'/></div>";
      build_detail_tabs = build_detail_tabs.replace("videotab", "videotab active");
    }
    else{
      // text embed
      detailInterface += "<div class='texttabpane'><textarea id='poly_detail' rows='6' cols='25' placeholder='Add Detail'>" + replaceAll(replaceAll((footprints[polyindex].description || ""),"<","&lt;"),">","&gt;") + "</textarea></div>";
      build_detail_tabs = build_detail_tabs.replace("texttab", "texttab active");
    }
    detailInterface += "</div>";
    
    building_pop.setContent(build_id + build_name + build_detail_tabs + detailInterface + appendToEditor + saveBtn);
    map.openPopup(building_pop);
  });
}
function detailTab(index){
  $(".nav > li").removeClass("active");
  switch(index){
    case 0:
      $(".texttab").addClass("active");
      $(".texttabpane").css({ display: "block" });
      $(".phototabpane").css({ display: "none" });
      $(".videotabpane").css({ display: "none" });
      if( !($(".texttabpane").length) ){
        $(".tabpane").append( "<div class='texttabpane'><textarea id='poly_detail' rows='6' cols='25' placeholder='Add Detail'>" + replaceAll(replaceAll((footprints[polyindex].description || ""),"<","&lt;"),">","&gt;") + "</textarea></div>" );
      }
      break;
    case 1:
      $(".phototab").addClass("active");
      $(".texttabpane").css({ display: "none" });
      $(".phototabpane").css({ display: "block" });
      $(".videotabpane").css({ display: "none" });
      if( !($(".phototabpane").length) ){
        $(".tabpane").append( "<div class='phototabpane'><strong>Embed picture</strong><br/><input placeholder='Image URL' value=''/></div>" );
      }
      break;
    case 2:
      $(".videotab").addClass("active");
      $(".texttabpane").css({ display: "none" });
      $(".phototabpane").css({ display: "none" });
      $(".videotabpane").css({ display: "block" });
      if( !($(".videotabpane").length) ){
        $(".tabpane").append( "<div class='videotabpane'><strong>Embed YouTube video</strong><br/><input placeholder='YouTube URL' value=''/></div>" );
      }
      break;
  }
}
function saveDetail(){
  // popup save
  var id = $('#selectedid').val() * 1;
  var name = $('#poly_name').val();
  var description = "";
  if($('.texttab').hasClass('active')){
    description = $('#poly_detail').val();
  }
  else if($('.phototab').hasClass('active')){
    description = "SETPIC:" + $(".phototabpane input").val();
  }
  else if($('.videotab').hasClass('active')){
    description = "SETVID:" + $(".videotabpane input").val();
  }
  var selcolor;
  footprints[ id ].name = name;
  footprints[ id ].description = description;
  if(typeof IE_EDITOR != "undefined" && IE_EDITOR){
    selcolor = $('#poly_color').val();
    if(selcolor == "#00f"){
      footprints[ id ].color = "";
    }
    else{
      footprints[ id ].color = selcolor;
    }
    footprints[ id ].geo.setStyle({ color: selcolor, opacity: 0.65, fillOpacity: 0.2 });
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
      var setColor = "#0033ff";
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
        case "eraser":
          setColor = "eraser";
          footprints[p].color = "erase";
          break;
      }
      if(setColor == "eraser"){
        footprints[p].geo.setStyle({ opacity: 0.3, fillOpacity: 0.0001, dashArray: "4 8" });
        break;
      }
      footprints[p].geo.setStyle({ color: setColor, opacity: 0.65, fillOpacity: 0.2, dashArray: "1 0" });
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
      // skip erased polygons
      if(footprints[f].color == "erase"){
        continue;
      }
      // collect all points in polygon
      var geopoints = footprints[f].geo.getLatLngs();
      var mypts = [ ];
      for(var g=0;g<geopoints.length;g++){
        mypts.push( [ geopoints[g].lng, geopoints[g].lat ] );
      }
      
      // save custom and city-provided properties
      var props = footprints[f].properties;
      props.fill = footprints[f].geo.options.color;
      props.name = footprints[f].name;
      props.description = footprints[f].description;

      // create a feature
      var geo = {
        "type": "Feature",
        "geometry": {
          "type": "Polygon",
          "coordinates": [ mypts ]
        },
        "properties": props
      };
      geofeatures.push(geo);
    }
    // create a feature collection
    var geojson = { "type": "FeatureCollection", "source": (src || ""), "features": geofeatures };
    // use BlobBuilder, FileSaver, and JSON.stringify to output
    bb.append( JSON.stringify( geojson ) );
    saveAs(bb.getBlob("application/json;charset=utf-8"), "mybuild.geojson");
  }
  else if(format == 0){ // KML
    bb.append('<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://earth.google.com/kml/2.2">\n	<Document>\n		<name>Majuro JS</name>\n			<description>Export from ' + (src || "") + '</description>\n');
    bb.append('			<Style id="red_poly">\n				<LineStyle>\n					<color>ff0000ff</color>\n				</LineStyle>\n				<PolyStyle>\n					<color>880000ff</color>\n				</PolyStyle>\n			</Style>\n			<Style id="blue_poly">\n				<LineStyle>\n					<color>ffff3300</color>\n				</LineStyle>\n				<PolyStyle>\n					<color>88ff3300</color>\n				</PolyStyle>\n			</Style>\n			<Style id="green_poly">\n				<LineStyle>\n					<color>ff00ff00</color>\n				</LineStyle>\n				<PolyStyle>\n					<color>8800ff00</color>\n				</PolyStyle>\n			</Style>\n			<Style id="orange_poly">\n				<LineStyle>\n					<color>ff005aff</color>\n				</LineStyle>\n				<PolyStyle>\n					<color>88005aff</color>\n				</PolyStyle>\n			</Style>\n');
    for(var f=0;f<footprints.length;f++){
      // skip erased polygons
      if(footprints[f].color == "erase"){
        continue;
      }
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
function startSave(){
  $("#savemapinfo").modal();
}
function saveMap(){
  var arredited = [];
  $.each(footprints, function(editShape, e){
    if(!footprints[editShape].color && !footprints[editShape].name && !footprints[editShape].description){
      // shape is unedited
      return;
    }
    arredited.push({
      id: footprints[editShape].id
    });
    if(footprints[editShape].color){
      arredited[ arredited.length-1 ].color = footprints[editShape].color;
      // jump to next polygon if this is erased
      if(footprints[editShape].color == "erase"){
        return;
      }
    }
    if(footprints[editShape].name){
      arredited[ arredited.length-1 ].name = footprints[editShape].name;
    }
    if(footprints[editShape].description){
      arredited[ arredited.length-1 ].description = footprints[editShape].description;
    }
  });
  // satellite maps checked?
  var sat = "false";
  if($("#savemapsat")[0].checked){
    sat = "true";
  }
  $.post("/savemap", { customgeo: customgeo, satellite: sat, edited: JSON.stringify(arredited), name: $("#savemapname").val(), info: $("#savemapinfotext").val() }, function(data){
    window.location = "/savemap/" + data.saveid;
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
function showDataSource(){
  $("#creditmessage").modal("toggle");
}

// Convex Hull Code via Leaflet Marker Clusterer

/* Copyright (c) 2012 the authors listed at the following URL, and/or
the authors of referenced articles or incorporated external code:
http://en.literateprograms.org/Quickhull_(Javascript)?action=history&offset=20120410175256

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

Retrieved from: http://en.literateprograms.org/Quickhull_(Javascript)?oldid=18434
*/

var getDistant = function (cpt, bl) {
  var vY = bl[1].lat - bl[0].lat,
	  vX = bl[0].lng - bl[1].lng;
  return (vX * (cpt.lat - bl[0].lat) + vY * (cpt.lng - bl[0].lng));
};

var findMostDistantPointFromBaseLine = function (baseLine, latLngs) {
  var maxD = 0,
	  maxPt = null,
	  newPoints = [],
	  i, pt, d;

  for (var i = latLngs.length - 1; i >= 0; i--) {
	pt = latLngs[i];
	d = this.getDistant(pt, baseLine);
    if (d > 0) {
      newPoints.push(pt);
	}
	else {
	  continue;
	}
	if (d > maxD) {
	  maxD = d;
	  maxPt = pt;
	}
  }
  return { 'maxPoint': maxPt, 'newPoints': newPoints };
};

var buildConvexHull = function (baseLine, latLngs) {
  var convexHullBaseLines = [],
  t = this.findMostDistantPointFromBaseLine(baseLine, latLngs);

  if (t.maxPoint) { // if there is still a point "outside" the base line
	convexHullBaseLines = convexHullBaseLines.concat(
	  this.buildConvexHull([baseLine[0], t.maxPoint], t.newPoints)
	);
	convexHullBaseLines = convexHullBaseLines.concat(
	  this.buildConvexHull([t.maxPoint, baseLine[1]], t.newPoints)
	);
	return convexHullBaseLines;
  }
  else {  // if there is no more point "outside" the base line, the current base line is part of the convex hull
    return [baseLine];
  }
};

var getConvexHull = function (latLngs) {
  //find first baseline
  var maxLat = false, minLat = false,
  maxPt = null, minPt = null,
  i;
  
  for (var i = latLngs.length - 1; i >= 0; i--) {
    var pt = latLngs[i];
    if (maxLat === false || pt.lat > maxLat) {
      maxPt = pt;
      maxLat = pt.lat;
    }
    if (minLat === false || pt.lat < minLat) {
      minPt = pt;
      minLat = pt.lat;
    }
  }
  var ch = [].concat(this.buildConvexHull([minPt, maxPt], latLngs), this.buildConvexHull([maxPt, minPt], latLngs));
  return ch;
};
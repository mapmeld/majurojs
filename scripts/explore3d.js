
function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}

var home = null;
if(getURLParameter("lat") && getURLParameter("lng")){
  home = [ getURLParameter("lng") * 1.0 - 0.001, getURLParameter("lat") * 1.0 + 0.0035 ];
}

var TILE_URL = "http://tile.stamen.com/toner/"

var width = window.innerWidth*3,
    height = window.innerHeight*3

var tile = d3.geo.tile()
    .size([width, height]);

var proj, zoom;

var map = d3.select("body");

var layer = map.append("div")
    .attr("class", "layer");

camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2000);
camera.position.set(width/2, -height/2, 500); // gen
camera.position.set(1180, -1500, 300);
camera.target = new THREE.Vector3(0, 0, 0);
camera.rotation.x += Math.PI/3;
renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

//init scene
scene = new THREE.Scene();
scene.add(camera);

var light = new THREE.PointLight(0xffffff);
light.shadowCameraVisible = true;
light.position.set(50000,5000,50000);
scene.add(light);

var light2 = new THREE.PointLight(0xffffff);
light2.shadowCameraVisible = true;
light2.position.set(-50000,5000,50000);
scene.add(light2);

var tileTextures = [];

function floorTile (url, d, t) {
  var tc = THREE.ImageUtils.loadTexture( url, function (evt) {
    renderer.render(scene, camera);
  })
  var material = new THREE.MeshLambertMaterial({ map: tc, color: 0xffffff })
  var plane = new THREE.Mesh(new THREE.PlaneGeometry(256, 256), material);
  plane.position.x = 128 + (tile().translate[0] + d[0])*256
  plane.position.y = -128 + (tile().translate[1] + d[1])*(-256)
  scene.add(plane);
  tileTextures.push(plane)
}

function v2d(x,y,z) {
  return new THREE.Vector2(x,y);
}

function v(x,y,z) {
  return new THREE.Vector3(x,y,z);
}

var meshes = []; // for later rotations etc

function loadBuildings(err, footprints) {
  if(err){
    console.log(err);
    return;
  }
  // add credit
  try{
    var src = footprints.source;
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
    $(src_credits).css({ "display": "inline" });
    if(src_credits.length){
      $("#createyours").attr("href", "/draw/" + src_credits.replace(".",""));
    }
  }
  catch(e){}
  var footprints = footprints.features;

  if(!home){
    // calculate center from GeoJSON features
    var centroid = function(poly){
      var pts=poly.coordinates[0];
      var x = 0;
      var y = 0;
      for(var p=0;p<pts.length-1;p++){
        x += pts[p][0] * 1.0;
        y += pts[p][1] * 1.0;
      }
      x /= pts.length - 1;
      y /= pts.length - 1;
      return [ x, y ];
    };
    var minlat = 90;
    var avglng = 0;
    for(var f=0;f<footprints.length;f++){
      var ctr = centroid(footprints[f].geometry);
      avglng += ctr[0];
      minlat = Math.min(minlat, ctr[1]);
    }
    avglng /= footprints.length;
    home = [ avglng - 0.001,  minlat + 0.002 ];
    //console.log(home);
  }

  proj = d3.geo.mercator()
    .center(home)
    .scale(Math.pow(2,27));

  zoom = d3.behavior.zoom()
    .scale(proj.scale())
    .translate(proj([0,0]))
    .on("zoom", zoomed);

  var floorGeom;
  footprints.forEach(function (e0, i0, c0) {
    floorGeom = []
    e0.geometry.coordinates[0].forEach(function (e1, i1, c1) {
      var scrnCoord = proj(e1)
      floorGeom.push(
        v2d(scrnCoord[0], (-1)*scrnCoord[1])
      )
    });

    var footprintshape2d = new THREE.Shape(floorGeom);
    var footprintExtrudable = new THREE.ExtrudeGeometry(footprintshape2d, {
      // height given or placeholder value
      amount: (e0.properties.height || 25)*1.3, height: 0,
      bevelEnabled: false,
      material: 0, extrudeMaterial: 1
    });
    var frontMaterial = new THREE.MeshLambertMaterial( { color: 0x3f3f48, wireframe: false } );
    var sideMaterial = new THREE.MeshLambertMaterial( { color: 0xf8fbbb, wireframe: false } );
	var materialArray = [ frontMaterial, sideMaterial ];
	footprintExtrudable.materials = materialArray;

    var bldg = new THREE.Mesh( footprintExtrudable, new THREE.MeshFaceMaterial() );
    scene.add(bldg);
    meshes.push(bldg)
  });
  
  zoomed();
}

d3.json('../mybuild.geojson', loadBuildings);

container = document.createElement('div');
document.body.appendChild(container);
container.appendChild(renderer.domElement);
renderer.render(scene, camera);

function zoomed() {
  var tiles = tile
      .scale(zoom.scale())
      .translate(zoom.translate())
      ();

  var image = layer
      .selectAll(".tile")
      .data(tiles, function(d) { return d; });

  image.exit()
      .remove();

  image.enter().append("img")
      .attr("class", "tile")
      .attr("hidden", function(d) {
        floorTile(TILE_URL + d[2] + "/" + d[0] + "/" + d[1] + ".png", d, tile);
        return "";
      });
}

var animationId;
function animate() {
  animationId = requestAnimationFrame( animate );
  renderer.render(scene, camera);
}
animate();

function keydown(event){
  var delta = 16;
  event = event || window.event;
  var keycode = event.keyCode;
  switch(keycode){
    case 37 : //left arrow
      event.preventDefault();
      camera.position.x -= delta;
      break;
    case 38 : // up arrow
      event.preventDefault();
      camera.position.y += delta;
      break;
    case 39 : // right arrow
      event.preventDefault();
      camera.position.x += delta;
      break;
    case 40 : //down arrow
      event.preventDefault();
      camera.position.y -= delta;
      break;
    case 190 : //
      event.preventDefault();
      camera.position.z += delta;
      break;
    case 188 : //
      event.preventDefault();
      camera.position.z -= delta;
      break;
    case 89 : //
      event.preventDefault();
      camera.rotation.y = camera.rotation.y + Math.PI/100;
      break;
    case 88 : //
      event.preventDefault();
      camera.rotation.x = camera.rotation.x + Math.PI/100;
      break;
    case 90 : //
      event.preventDefault();
      camera.rotation.z = camera.rotation.z + Math.PI/100;
      break;
    case 55 : //
      event.preventDefault();
      camera.rotation.y = camera.rotation.y - Math.PI/100;
      break;
    case 68 : //
      event.preventDefault();
      camera.rotation.x = camera.rotation.x - Math.PI/100;
      break;
    case 83 : //
      event.preventDefault();
      camera.rotation.z = camera.rotation.z - Math.PI/100;
      break;
  }
  camera.updateProjectionMatrix();
  renderer.render( scene, camera );
  cancelAnimationFrame(animationId);
}
document.addEventListener('keydown',keydown,false);

function showDataSource(){
  $("#creditmessage").modal("toggle");
}

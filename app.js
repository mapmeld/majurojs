/**
 * Module dependencies.
 */
var express = require('express')
    , mongoose = require('mongoose')
    , routes = require('./routes')
    , middleware = require('./middleware')
    , request = require('request')
    , timepoly = require('./timepoly')
    , customgeo = require('./customgeo')
    , savemap = require('./savemap')
    , region = require('./region')
    ;

var HOUR_IN_MILLISECONDS = 3600000;

var included_sources = [ "allegheny", "austin", "baltimore", "bloomington", "boston", "boulder", "chapelhill", "chatham", "chicago", "clark", "kitsap", "lancaster", "midland", "nanaimo", "oakland", "petaluma", "philadelphia", "pittsburgh", "raleigh", "roundrock", "sagis", "sanfrancisco", "savannah", "seattle", "smith", "spokane", "steamboatsprings", "tyler", "westsacramento" ];

var init = exports.init = function (config) {
  
  var db_uri = process.env.MONGOLAB_URI || process.env.MONGODB_URI || config.default_db_uri;

  mongoose.connect(db_uri);

  var app = express.createServer();

  app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', { pretty: true });

    app.use(express.bodyParser());
    app.use(express.cookieParser());
    app.use(express.methodOverride());
    app.use(express.static(__dirname + '/public'));
    app.use(app.router);

  });

  app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  });

  app.configure('production', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: false}));
  });
  
  // Routes
  app.get('/', function(req, res){
    // show homepage
    res.render('homepage');
  });

  // use Leaflet polygon editing tools to select a neighborhood
  app.get('/draw', function(req, res){
    res.render('checkouttimemaker', { src: req.query.src });
  });
  app.get('/draw/:src', function(req, res){
    res.render('checkouttimemaker', { src: req.params.src });
  });
  // experimental OpenLayers neighborhood-selector
  app.get('/instantdraw/:src', function(req, res){
    res.render('instantdraw', { src: req.params.src });
  });
  
  app.post('/customgeo', function(req, res){
    var shape = new customgeo.CustomGeo({
      "latlngs": req.body.pts.split("|"),
      "created": (new Date()) * 1
    });
    shape.save(function (err){
      res.send({ id: shape._id });
    });
  });
  
  // database fixes
  app.post('/settime', function(req, res){
    timepoly.TimePoly.findOne({ "ll": [ req.body.lat * 1.0, req.body.lng * 1.0 ] }).exec(function(err, poly){
      if(err){
        return res.send(err);
      }
      poly.start = (new Date("January 10, " + req.body.startyr)) * 1;
      poly.save(function(err){
        res.send(err || "success");
      });
    });
  });
  
  app.post('/createregion', function(req, res){
    // POST /createregion with src = chicago
    // then POST /createregion with name = DISTRICT_NAME and geo = LAT1,LNG1|LAT2,LNG2
    if(req.body.start && req.body.start == "chicago"){
      r = new region.Region({
        name: "chicago",
        fullname: "Chicago",
        images: [ "/images/chicagobg.png", "/images/chicagologo.png" ],
        divisions: [
          {
            category: "Community Areas",
            districts: []
          }
        ]
      });
      r.save(function(err){
        res.send(err || "success");
      });
    }
    else if(req.body.name && req.body.geo && req.body.src){
      region.Region.findOne({ "name": req.body.src }).exec(function(err, myregion){
        var shape = new customgeo.CustomGeo({
          "latlngs": req.body.geo.split("|")
        });
        shape.save(function(err){
          if(err){
            return res.send(err);
          }
          myregion.divisions[0].districts.push({
            name: req.body.name,
            geo: shape._id
          });
          myregion.save(function(err){
            res.send(err || "success");
          });
        });
      });
    }
  });
  
  app.get('/regions/recent', function(req, res){
    var yesterday = (new Date() * 1) - 24 * 60 * 60 * 1000;
    customgeo.CustomGeo.find({'created': { "$gt": yesterday }}).limit(20).exec(function(err, recents){
      if(err){ return res.send(err); }
      res.render('geolist', { geos: recents });
    });
  });
  
  app.get('/regions/:regionname', function(req, res){
    region.Region.findOne({ "name": req.params.regionname }).exec(function(err, myregion){
      if(err){ return res.send(err); }
      res.render('regions', { region: myregion });
    });
  });

  app.get('/regionmap/:geo', function(req, res){
    customgeo.CustomGeo.findById(req.params.geo, function(err, geo){
      if(err){
        return res.send(err);
      }
      var poly = geo.latlngs;
      // round to 5 decimal places instead of 6
      for(var pt=0;pt<poly.length;pt++){
        poly[pt] = [ Math.round(poly[pt].split(",")[0] * 100000) / 100000, Math.round(poly[pt].split(",")[1] * 100000) / 100000 ];
      }
      poly.push(poly[0]);
      // for the time being, use Google Static Maps API: https://developers.google.com/maps/documentation/staticmaps/?hl=nl
      res.redirect('http://maps.google.com/maps/api/staticmap?sensor=false&size=256x256&path=fillcolor:0x0000FF33|weight:1|' + poly.join('|'));
    });
  });

  // show map and editor
  app.get('/build', function(req, res){
    res.render('custombuild', { src: (req.query.src || ""), customgeo: req.query.customgeo });
  });
  app.get('/build/:customgeo', function(req, res){
    res.render('custombuild', { src: "", customgeo: req.params.customgeo });
  });
  app.get('/build/:src/:customgeo', function(req, res){
    res.render('custombuild', { src: req.params.src, customgeo: req.params.customgeo });
  });

  app.post('/timeline', function(req, res){
    // load this point into MongoDB
    coordinates = req.body['points'].split('||');
    for(var c=0;c<coordinates.length;c++){
      coordinates[c] = coordinates[c].split('|');
      coordinates[c][0] *= 1.0;
      coordinates[c][1] *= 1.0;
    }
    var savedata = {
      "points": coordinates,
      // src is the name of the city, county, or other locality
      "src": req.body.src,
      // use [ lng , lat ] format to be consistent with GeoJSON
      "ll": [ req.body['lng'] * 1.0, req.body['lat'] * 1.0 ]
    };
    if(req.body.name){
      savedata["name"] = req.body.name;
    }
    if(req.body.address){
      savedata["address"] = req.body.address;
    }
    if(req.body.start){
      savedata["start"] = req.body.start * 1;
    }
    if(req.body.startyr){
      savedata["start"] = (new Date("January 10, " + req.body.startyr)) * 1;
    }
    if(req.body.end){
      savedata["end"] = req.body.end * 1;
    }
    poly = new timepoly.TimePoly( savedata );
    poly.save(function(err){
      res.send(err || 'success');
    });
  });

  // show timeline
  app.get('/timeline', function(req, res){
    //res.render('checkouttime', { customgeo: req.query['customgeo'] });
    res.render('leaflettimeline', { src: (req.query.src || ""), customgeo: req.query.customgeo });
  });
  app.get('/timeline/:customgeo', function(req, res){
    res.render('leaflettimeline', { src: "", customgeo: req.params.customgeo });
  });
  app.get('/timeline/:src/:customgeo', function(req, res){
    res.render('leaflettimeline', { src: req.params.src, customgeo: req.params.customgeo });
  });

  // show map in 3D
  app.get('/explore3d', function(req, res){
    res.render('explore3d', { src: (req.query.src || ""), customgeo: req.query.customgeo, lng: req.query.lng, lat: req.query.lat });
  });
  app.get('/explore3d/:customgeo', function(req, res){
    res.render('explore3d', { src: "", customgeo: req.params.customgeo, lng: req.query.lng, lat: req.query.lat });
  });
  app.get('/explore3d/:src/:customgeo', function(req, res){
    res.render('explore3d', { src: req.params.src, customgeo: req.params.customgeo, lng: req.query.lng, lat: req.query.lat });
  });
  
  // store map details as a SaveMap
  app.post('/savemap', function(req, res){
    var mymap = new savemap.SaveMap({
      customgeo: req.body.customgeo,
      edited: JSON.parse(req.body.edited),
      name: req.body.name,
      info: req.body.info
    });
    mymap.save(function (err){
      res.send({ saveid: mymap._id });
    });
  });

  // retrieve map details from a SaveMap
  app.get('/savemap', function(req, res){
    savemap.SaveMap.findById(req.query.id, function(err, mymap){
      if(err){ return res.send(err); }
      res.render('savemap', { "id": req.query.id, "customgeo": mymap.customgeo, "edited": JSON.stringify( mymap.edited ), "name": (mymap.name || ""), "info": (mymap.info || "") });
    });
  });
  app.get('/savemap.*', function(req, res){
    // redirect old KML and JSON requests to the new REST URL
    res.redirect('/savemap/' + req.query.id + '.' + req.url.split(".")[1]);
  });
  app.get('/savemap/:id.*', function(req, res){
    savemap.SaveMap.findById(req.params.id, function(err, mymap){
      if(req.url.indexOf('.kml') > -1 || req.url.indexOf('.json') > -1){
        // return saved map as KML or GeoJSON
        // first, fetch custom geo area
        customgeo.CustomGeo.findById(mymap.customgeo, function(err, geo){
          if(err){
            return res.send(err);
          }
          // format polygon for query
          var poly = geo.latlngs;
          for(var pt=0;pt<poly.length;pt++){
            poly[pt] = [ poly[pt].split(",")[1] * 1.0, poly[pt].split(",")[0] * 1.0 ];
          }
          // get buildings at this point
          timepoly.TimePoly.find({ ll: { "$within": { "$polygon": poly } } }).limit(10000).exec(function(err, timepolys){
            if(err){
              return res.send(err);
            }
            // pre-process timepolys to add edits
            for(var t=0;t<timepolys.length;t++){
              // stored maps = custom building edits, not timeline
              timepolys[t].start = null;
              timepolys[t].end = null;
              var coords = timepolys[t].points;
              var avg = [0, 0];
              for(var c=0;c<coords.length;c++){
                avg[0] += coords[c][0];
                avg[1] += coords[c][1];
              }
              avg[0] /= coords.length;
              avg[0] = avg[0].toFixed(6);
              avg[1] /= coords.length;
              avg[1] = avg[1].toFixed(6);
              var myid = avg.join(',') + "," + coords.length;
              for(var e=0;e<mymap.edited.length;e++){
                if(mymap.edited[e].id == myid){
                  if(mymap.edited[e].color){
                    timepolys[t].color = mymap.edited[e].color;
                    switch(mymap.edited[e].color){
                      case "#f00":
                        timepolys[t].style = "#red_poly";
                        break;
                      case "#0f0":
                        timepolys[t].style = "#green_poly";
                        break;
                      case "#00f":
                        timepolys[t].style = "#blue_poly";
                        break;
                      case "#ff5a00":
                        timepolys[t].style = "#orange_poly";
                        break;
                    }
                  }
                  if(mymap.edited[e].name){
                    timepolys[t].name = mymap.edited[e].name;
                  }
                  if(mymap.edited[e].description){
                    timepolys[t].description = mymap.edited[e].description;
                  }
                  mymap.edited.splice(e,1);
                  break;
                } 
              }
            }
            processTimepolys(timepolys, req, res, mymap.name || "", mymap.info || "");
          });
        });
      }
    });
  });
  app.get('/savemap/:id', function(req, res){
    savemap.SaveMap.findById(req.params.id, function(err, mymap){
      if(err){ return res.send(err); }
      res.render('savemap', { "id": req.params.id, "customgeo": mymap.customgeo, "edited": JSON.stringify( mymap.edited ), "name": (mymap.name || ""), "info": (mymap.info || "") });
    });
  });
  
  var replaceAll = function(src, oldr, newr){
    while(src.indexOf(oldr) > -1){
      src = src.replace(oldr, newr);
    }
    return src;
  };
  
  var describe = function(description){
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
  };
  
  var processTimepolys = function(timepolys, req, res, optname, optinfo){
    var src = "";
    if(timepolys.length){
      src = timepolys[0].src;
    }
    else{
      if(req.query['src'] && included_sources.indexOf( req.query['src'] ) != -1){
        src = req.query['src'];
      }
      else{
        src = "Source unknown";
      }
    }
    if(req.url.indexOf('kml') > -1){
      // KML output
      var kmlintro = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://earth.google.com/kml/2.2">\n	<Document>\n		<name>' + (optname || 'Majuro.js Export') + '</name>\n		<description><![CDATA[' + (optinfo || 'Buildings Export, Source: ' + src) + ']]></description>\n';
      kmlintro += '			<Style id="poly">\n				<LineStyle>\n					<color>aaff0000</color>\n				</LineStyle>\n				<PolyStyle>\n					<color>88ff0000</color>\n				</PolyStyle>\n			</Style>\n';
      kmlintro += '			<Style id="red_poly">\n				<LineStyle>\n					<color>ff0000ff</color>\n				</LineStyle>\n				<PolyStyle>\n					<color>880000ff</color>\n				</PolyStyle>\n			</Style>\n			<Style id="blue_poly">\n				<LineStyle>\n					<color>ffff0000</color>\n				</LineStyle>\n				<PolyStyle>\n					<color>88ff0000</color>\n				</PolyStyle>\n			</Style>\n			<Style id="green_poly">\n				<LineStyle>\n					<color>ff00ff00</color>\n				</LineStyle>\n				<PolyStyle>\n					<color>8800ff00</color>\n				</PolyStyle>\n			</Style>\n			<Style id="orange_poly">\n				<LineStyle>\n					<color>ff005aff</color>\n				</LineStyle>\n				<PolyStyle>\n					<color>88005aff</color>\n				</PolyStyle>\n			</Style>\n';

      var kmlpts = '';
      for(var t=0; t<timepolys.length; t++){
        // create KML coordinate string
        var coordstring = [];
        for(var p=0;p<timepolys[t].points.length;p++){
          var lng = timepolys[t].points[p][0];
          var lat = timepolys[t].points[p][1];
          coordstring.push(lng + "," + lat + ",0");
        }
        coordstring = coordstring.join(" ");
        
        kmlpts += '	<Placemark>\n';
        kmlpts += '		<name>' + ( timepolys[t].name || timepolys[t].address || timepolys[t]._id ) + '</name>';
        kmlpts += '		<styleUrl>' + ( timepolys[t].style || '#poly' ) + '</styleUrl>\n';

        // time-enabled KML?
        if(timepolys[t].start){
          var startstamp = timepolys[t].start;
          var endstamp = timepolys[t].end || (new Date());
          kmlpts += '		<TimeSpan>\n';
          kmlpts += '			<begin>' + startstamp + '</begin>\n';
          kmlpts += '			<end>' + endstamp + '</end>\n';
          kmlpts += '		</TimeSpan>\n';
          kmlpts += '		<description>Begins ' + startstamp + ', ends ' + endstamp + '</description>\n';
        }
        
        // description (will only occur if timepolys sent from a stored map)
        if(timepolys[t].description){
          kmlpts += '		<description><![CDATA[<div>' + describe(timepolys[t].description) + '</div>]]></description>\n';
        }
        
		kmlpts += '		<Polygon>\n';
		kmlpts += '			<tessellate>1</tessellate>\n';
		kmlpts += '			<outerBoundaryIs>\n';
		kmlpts += '				<LinearRing>\n';
		kmlpts += '					<coordinates>' + coordstring + '</coordinates>\n';
		kmlpts += '				</LinearRing>\n';
		kmlpts += '			</outerBoundaryIs>\n';
		kmlpts += '		</Polygon>\n';		
        kmlpts += '	</Placemark>\n';
      }
      var kmlout = '  </Document>\n</kml>';
      res.setHeader('Content-Type', 'application/kml');
      res.send(kmlintro + kmlpts + kmlout);
    }
    else{
      // GeoJSON output
      for(var t=0; t<timepolys.length; t++){
        var proplist = { };
        if(timepolys[t].name){
          proplist["name"] = timepolys[t].name;
        }
        if(timepolys[t].description){
          proplist["description"] = timepolys[t].description;
        }
        if(timepolys[t].color){
          proplist["fill"] = timepolys[t].color;
        }
        if(timepolys[t].address){
          proplist["address"] = timepolys[t].address;
        }
        if(timepolys[t].start){
          proplist["start"] = timepolys[t].start * 1;
        }
        if(timepolys[t].end){
          proplist["end"] = timepolys[t].end * 1;
        }
        timepolys[t] = {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [ timepolys[t].points ]
          },
          "properties": proplist
        };
      }
      res.json({ "type": "FeatureCollection", "source": src, "features": timepolys, "name": (optname || ""), "info": (optinfo || "") });
    }
  };
  
  // get GeoJSON inside a custom polygon
  app.get('/timeline-at', function(req, res){
    // redirect old URL params to REST
    if(req.query.customgeo){
      if(req.query.src){
        res.redirect('/timeline-at/' + req.query.src + '/' + req.query.customgeo);
      }
      else{
        res.redirect('/timeline-at/' + req.query.customgeo);        
      }
    }
  });
  app.get('/timeline-at.*', function(req, res){
    // redirect old URL params to REST
    if(req.query.customgeo){
      if(req.query.src){
        res.redirect('/timeline-at/' + req.query.src + '/' + req.query.customgeo + '.' + req.url.split(".")[1]);
      }
      else{
        res.redirect('/timeline-at/' + req.query.customgeo + '.' + req.url.split(".")[1]);
      }
    }
  });
  app.get('/timeline-at/:src/:customgeo', function(req, res){
    var reqgeo = req.params.customgeo.split(".")[0];
    if(reqgeo.indexOf("[") == -1){
      // requesting geo by id
      customgeo.CustomGeo.findById(reqgeo, function(err, geo){
        if(err){
          return res.send(err);
        }
        var poly = geo.latlngs;
        for(var pt=0;pt<poly.length;pt++){
          poly[pt] = [ poly[pt].split(",")[1] * 1.0, poly[pt].split(",")[0] * 1.0 ];
        }
        timepoly.TimePoly.find({ src: req.params.src, ll: { "$within": { "$polygon": poly } } }).limit(10000).exec(function(err, timepolys){
          if(err){
            return res.send(err);
          }
          processTimepolys(timepolys, req, res);
        });
      });
    }
    else{
      // API request in form /timeline-at/:src/:polygon where polygon is [ [ lng1, lat1 ], [lng2, lat2], [lng3, lat3]... ]
      timepoly.TimePoly.find({ src: req.params.src, ll: { "$within": { "$polygon": JSON.parse(reqgeo) } } }).limit(10000).exec(function(err, timepolys){
        if(err){
          return res.send(err);
        }
        processTimepolys(timepolys, req, res);
      });
    }
  });
  app.get('/timeline-at/:customgeo', function(req, res){
    var reqgeo = req.params.customgeo.split(".")[0];
    if(reqgeo.indexOf("[") == -1){
      // requesting geo by id
      customgeo.CustomGeo.findById(reqgeo, function(err, geo){
        if(err){
          return res.send(err);
        }
        var poly = geo.latlngs;
        for(var pt=0;pt<poly.length;pt++){
          poly[pt] = [ poly[pt].split(",")[1] * 1.0, poly[pt].split(",")[0] * 1.0 ];
        }
        timepoly.TimePoly.find({ ll: { "$within": { "$polygon": poly } } }).limit(10000).exec(function(err, timepolys){
          if(err){
            return res.send(err);
          }
          processTimepolys(timepolys, req, res);
        });
      });
    }
    else{
      // API request in form /timeline-at/:polygon where polygon is [ [ lng1, lat1 ], [lng2, lat2], [lng3, lat3]... ]
      timepoly.TimePoly.find({ ll: { "$within": { "$polygon": JSON.parse(reqgeo) } } }).limit(10000).exec(function(err, timepolys){
        if(err){
          return res.send(err);
        }
        processTimepolys(timepolys, req, res);
      });
    }
  });

  app.get('/auth', middleware.require_auth_browser, routes.index);
  app.post('/auth/add_comment',middleware.require_auth_browser, routes.add_comment);
  
  // redirect all non-existent URLs to doesnotexist
  app.get('*', function onNonexistentURL(req,res) {
    res.render('doesnotexist',404);
  });

  return app;
};

// Don't run if require()'d
if (!module.parent) {
  var config = require('./config');
  var app = init(config);
  app.listen(process.env.PORT || 3000);
  console.info("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
}
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

var included_sources = [ "allegheny", "chicago", "lancaster", "oakland", "philadelphia", "pittsburgh", "savannah", "seattle" ];

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

  app.get('/draw', function(req, res){
    // show timeline editor (not yet designed)
    res.render('checkouttimemaker');
  });
  
  app.post('/customgeo', function(req, res){
    var shape = new customgeo.CustomGeo({
      "latlngs": req.body.pts.split("|")
    });
    shape.save(function (err){
      res.send({ id: shape._id });
    });
  });

  app.get('/build', function(req, res){
    // show map and editor
    res.render('custombuild', { customgeo: req.query['customgeo'] });
  });
  
  app.get('/timeline', function(req, res){
    // show timeline
    res.render('checkouttime', { customgeo: req.query['customgeo'] });
  });

  app.get('/explore3d', function(req, res){
    // show map in 3D
    res.render('explore3d', { customgeo: req.query['customgeo'], lng: req.query['lng'], lat: req.query['lat'] });
  });
  
  app.post('/savemap', function(req, res){
    // store map details as a SaveMap
    var mymap = new savemap.SaveMap({
      customgeo: req.body.customgeo,
      edited: JSON.parse(req.body.edited)
    });
    mymap.save(function (err){
      res.send({ saveid: mymap._id });
    });
  });
  app.get('/savemap*', function(req, res){
    savemap.SaveMap.findById(req.query['id'], function(err, mymap){
      if(err){
        return res.send(err);
      }
      if(req.url.indexOf('kml') > -1 || req.url.indexOf('json') > -1){
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
              var coords = timepolys[t].geometry.coordinates[0];
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
                        timepolys[t].style = "#poly_red";
                        break;
                      case "#0f0":
                        timepolys[t].style = "#poly_green";
                        break;
                      case "#00f":
                        timepolys[t].style = "#poly_blue";
                        break;
                      case "#ff5a00":
                        timepolys[t].style = "#poly_orange";
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
            processTimePolys(timepolys, req, res);
          });
        });
      }
      else{
        // show saved map
        res.render('savemap', { "customgeo": mymap.customgeo, "edited": JSON.stringify( mymap.edited ) });
      }
    });
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
      savedata["start"] = new Date(req.body.start * 1);
    }
    if(req.body.end){
      savedata["end"] = new Date(req.body.end * 1);
    }
    poly = new timepoly.TimePoly( savedata );
    poly.save(function(err){
      res.send(err || 'success');
    });
  });
  
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
  
  var processTimepolys = function(timepolys, req, res){
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
      var kmlintro = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://earth.google.com/kml/2.2">\n	<Document>\n		<name>Majuro Export</name>\n		<description>Buildings Export, Source: ' + src + '</description>\n';
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
      res.json({ "type": "FeatureCollection", "source": src, "features": timepolys });
    }
  };
  
  app.get('/timeline-at*', function(req, res){
    if(req.query['customgeo'] && req.query['customgeo'] != ""){
      // do a query to return GeoJSON inside a custom polygon
      customgeo.CustomGeo.findById(req.query['customgeo'], function(err, geo){
        if(err){
          res.send(err);
          return;
        }
        var poly = geo.latlngs;
        for(var pt=0;pt<poly.length;pt++){
          poly[pt] = [ poly[pt].split(",")[1] * 1.0, poly[pt].split(",")[0] * 1.0 ];
        }
        //res.send(poly);
        //return;
        if(req.query['src']){
          // speed up query with a specific city, county, or locality
          timepoly.TimePoly.find({ src: req.query['src'] }).find({ ll: { "$within": { "$polygon": poly } } }).limit(10000).exec(function(err, timepolys){
            if(err){
              res.send(err);
              return;
            }
            processTimepolys(timepolys, req, res);
          });
        }
        else{
          timepoly.TimePoly.find({ ll: { "$within": { "$polygon": poly } } }).limit(10000).exec(function(err, timepolys){
            if(err){
              res.send(err);
              return;
            }
            processTimepolys(timepolys, req, res);
          });
        }
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
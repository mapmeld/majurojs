/*jshint laxcomma:true */

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
    ;

var HOUR_IN_MILLISECONDS = 3600000;

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
    // show timeline editor (not yet designed)
    res.render('checkouttimemaker');
  });
  
  app.post('/customgeo', function(req, res){
    var shape = new customgeo.CustomGeo({
      latlngs: req.body.pts.split("|")
    });
    shape.save(function (err){
      res.send({ id: shape._id });
    });
  });
  app.get('/timeline', function(req, res){
    // show map
    res.render('custombuild', { customgeo: req.query['customgeo'] });
  });
  app.get('/explore3d', function(req, res){
    // show map in 3D
    res.render('explore3d', { customgeo: req.query['customgeo'], lng: req.query['lng'], lat: req.query['lat'] });
  });
  
  app.post('/timeline', function(req, res){
    // load this point into MongoDB
    coordinates = req.body['points'].split('||');
    for(var c=0;c<coordinates.length;c++){
      coordinates[c] = coordinates[c].split('|');
      coordinates[c][0] *= 1.0;
      coordinates[c][1] *= 1.0;
    }
    poly = new timepoly.TimePoly({
      points: coordinates,
      // use [ lng , lat ] format to be consistent with GeoJSON
      ll: [ req.body['lng'] * 1.0, req.body['lat'] * 1.0 ]
    });
    poly.save(function(err){
      res.send(err || 'success');
    });
  });
  
  var processTimepolys = function(timepolys, req, res){
    if(req.url.indexOf('kml') > -1){
      // time-enabled KML output
      var kmlintro = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://earth.google.com/kml/2.2">\n	<Document>\n		<name>Savannah KML</name>\n		<description>Savannah Buildings Export</description>\n		<Style id="dot-icon">\n			<IconStyle>\n					<scale>0.6</scale>\n        <Icon>\n          <href>http://homestatus.herokuapp.com/images/macon-marker-02.png</href>\n        </Icon>\n      </IconStyle>\n    </Style>\n    <Style>\n      <ListStyle>\n        <listItemType>checkHideChildren</listItemType>\n      </ListStyle>\n    </Style>\n';
      var kmlpts = '';
      for(var t=0; t<timepolys.length; t++){
        var coordstring = [];
        for(var p=0;p<timepolys[t].points.length;p++){
          var lng = timepolys[t].points[p][0];
          var lat = timepolys[t].points[p][1];
          coordstring.push(lng + "," + lat + ",0");
        }
        coordstring = coordstring.join(" ");
        kmlpts += '	<Placemark>\n';
        kmlpts += '		<name>' + timepolys[t]._id + '</name>';
        kmlpts += '		<styleUrl>#poly-url</styleUrl>\n';
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
        timepolys[t] = {
          "type": "Feature",
          "geometry": {
            "type": "Polygon",
            "coordinates": [ timepolys[t].points ]
          },
          "properties": { }
        };
      }
      res.send({ "type": "FeatureCollection", "features": timepolys });
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
        timepoly.TimePoly.find({ ll: { "$within": { "$polygon": poly } } }).limit(10000).exec(function(err, timepolys){
          if(err){
            res.send(err);
            return;
          }
          processTimepolys(timepolys, req, res);
        });
      });
    }
    else{
      // do a query to return GeoJSON timeline near a point
      timepoly.TimePoly.find({ ll: { "$nearSphere": [  req.query["lng"] || -83.645782, req.query['lat'] || 32.837026 ], "$maxDistance": 0.01 } }).limit(10000).exec(function(err, timepolys){
        // convert all timepolys into GeoJSON format
        if(err){
          res.send(err);
          return;
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
$(document).ready(function(){
  var width = 1276, height = 644;
  var ctrlat, ctrlng, geoscale;
  var color = d3.scale.category20();
  var force = d3.layout.force()
    .charge(-200)
    .size([width, height]);

  var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

  var geopath = d3.geo.path();
  var decades = { };
  // comment out the random colors statement below if you want fixed colors
  var decadeColors = {
    "1880": "#ccc",
    "1890": "#4e4",
    "1900": "#44e",
    "1910": "#4433ef",
    "1920": "#ef44ef",
    "1930": "#efef44",
    "1940": "#44aaef",
    "1950": "#e0e0e0",
    "1960": "#cccccc",
    "1970": "#e48",
    "1980": "midnightblue",
    "1990": "orange",
    "2000": "maroon",
    "2010": "tan"
  };
  // not so good at color selection... let's try random colors
  for(decade in decadeColors){
    decadeColors[decade] = "rgb(" + parseInt(Math.random() * 256) + "," + parseInt(Math.random() * 256) + "," + parseInt(Math.random() * 256) + ")";
  }

  // simplified centroid
  var centroid = function(poly, mytimer){
    var pts=poly.coordinates[0];
    var x = 0;
    var y = 0;
    for(var p=0;p<pts.length-1;p++){
      x += pts[p][0] * 1.0;
      y += pts[p][1] * 1.0;
    }
    x /= pts.length - 1;
    y /= pts.length - 1;
    if(mytimer || time_end){
      return [ (x - ctrlng) * mytimer / 200 + ctrlng, (y - ctrlat) * mytimer / 200 + ctrlat ];
    }
    else{
      return [ x, y ];
    }
  };
  
  var graph;

  d3.json("/timeline-at/" + customgeo, function(error, gj){
    var src = gj.source;
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
    if(src_credits.length){
      $("#createyours").attr("href", "/draw/" + src_credits.replace(".",""));
    }

    graph = {
      nodes: [],
      geometries: gj,
      links: []
    };

    // calculate centroid and scale
    var minlat = 90;
    var maxlat = -90;
    var minlng = 180;
    var maxlng = -180;

    for(var a=gj.features.length-1;a>=0;a--){
      if(typeof gj.features[a].properties.start == 'undefined'){
        gj.features.splice(a, 1);
        continue;
      }

      var ctr = centroid(parcels.features[t].geometry);
      minlat = Math.min(minlat, ctr[1]);
      maxlat = Math.max(maxlat, ctr[1]);
      minlng = Math.min(minlng, ctr[0]);
      maxlng = Math.max(maxlng, ctr[0]);

      gj.features[a].properties.INDEX = a;
      graph.nodes.push({
        group: a,
        name: "gr" + a
      });
      var myyear = new Date( gj.features[a].properties.start * 1 );
      myyear = myyear.getFullYear();
      //var myyear = Math.random() * 100 + 1900;
      if(decades[ Math.floor(myyear / 10) + "0" ]){
        // has a decade marker
        graph.links.push({
          source: a,
          target: decades[ Math.floor(myyear / 10) + "0" ],
          value: 0.5
        });
      }
      else{
        // this building is the first marker of this decade
        decades[ Math.floor(myyear / 10) + "0" ] = a;
      }
      gj.features[a].properties.color = decadeColors[ Math.floor(myyear / 10) + "0" ];
    }
    
    ctrlat = (minlat + maxlat) / 2;
    ctrlng = (minlng + maxlng) / 2;
    geoscale = 12000000 / (Math.max(maxlng - minlng, 1.5 * (maxlat - minlat)) / 0.01967949560602733);
    
    force
      .nodes(graph.nodes.reverse())
      .links(graph.links)
      .start();

    var tracts = svg.selectAll("circle.node")
      .data(graph.nodes)
      .enter().append("path")
      .data(graph.geometries.features)
      .attr("d", geopath.projection( d3.geo.mercator().scale(geoscale).center([ctrlng, ctrlat]) ) )
      .style("fill", function(d) { return d.properties.color; })
      .attr("class", "node mapnode")
      .call(force.drag);
    
    // create control circles
    var node = svg.selectAll("circle.node")
      .data(graph.nodes)
      .enter().append("circle")
      .attr("class", function(d){ return "node d" + d.name })
      .attr("r", 5)
      .style("fill", function(d) { return color(d.group); })
      .style("display", "none")
      .call(force.drag);

    // create decade labels
    for(decade in decades){      
      svg.append("text")
        .text(decade + "s")
        .attr("class", "t" + decades[decade])
        .attr("x", 0)
        .attr("y", 0)
        .style("text-shadow", "2px 2px #fff")
        .style("display", "none");
    }

    // start polygons in map form
    var moveTracts = false;
    var mytimer;
    setTimeout(function(){
      svg.selectAll("text").style("display", "block");
      mytimer = 0;
      moveTracts = true;
    }, 1000);

    force.on("tick", function() {
      node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });

      // keep text labels on center building
      for(decade in decades){
        var matchCircle = svg.select(".dgr" + decades[decade]);
        var matchText = svg.select(".t" + decades[decade]);
        matchText.attr("x", matchCircle.attr("cx") - 20);
        matchText.attr("y", matchCircle.attr("cy") - 20);        
      }
    
      // transition buildings to dots
      if(moveTracts){
        if(mytimer <= 200){
          mytimer++;
          for(var t=0;t<tracts[0].length;t++){
            d3.select(tracts[0][t]).attr("d", geopath.projection( d3.geo.mercator().scale(geoscale).center( centroid(graph.geometries.features[t].geometry, mytimer) ) ) );
          }
          if(mytimer == 200){
            node.style("display", "block");
          }
        }
        tracts.attr("transform", function(d) {
      	  var matchCircle = svg.select(".dgr" + d.properties.INDEX);
      	  if(mytimer <= 200){
     	    return "translate(" + (matchCircle.attr("cx") - 480) * mytimer / 200 + "," + (matchCircle.attr("cy") - 250) * mytimer / 200 + ")";
    	  }
    	  else{
     	    return "translate(" + (matchCircle.attr("cx") - 480) + "," + (matchCircle.attr("cy") - 250) + ")";
     	  }
        });
      }
    });
  });
});

function showDataSource(){
  $("#creditmessage").modal("toggle");
}
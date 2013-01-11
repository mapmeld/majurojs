$(document).ready(function(){
  var width = 1276, height = 644;
  var color = d3.scale.category20();
  var force = d3.layout.force()
    .charge(-250)
    .size([width, height]);

  var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

  var geopath = d3.geo.path();
  var decades = { };
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
    graph = {
      nodes: [],
      geometries: gj,
      links: []
    };
    for(var a=0;a<gj.features.length;a++){
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
    }
    force
      .nodes(graph.nodes)
      .links(graph.links)
      .start();

    var tracts = svg.selectAll("circle.node")
      .data(graph.nodes)
      .enter().append("path")
      .data(graph.geometries.features)
      .attr("d", geopath.projection( d3.geo.mercator().scale(200000).center([-87.6308311,41.8859622]) ) )
      .style("fill", function(d) { return color(d.group); })
      .attr("class", "node mapnode")
      .call(force.drag);

    // center each tract on its dot (calculate centroid using area and list of points)
    // calculation based on jsFiddle shown in http://stackoverflow.com/questions/4814675/find-center-point-of-a-polygon-in-js
    var poly_area = function(pts){
      var area=0;
      var nPts = pts.length;
      var j=nPts-1;
      var p1, p2;
      for(var i=0;i<nPts;j=i++){
        p1={x: pts[i][0], y: pts[i][1] };
        p2={x: pts[j][0], y: pts[j][1] };
        area+=p1.x*p2.y;
        area-=p1.y*p2.x;
      }
      area/=2;
      return area;
    };

    var centroid = function(poly){
      var pts = poly.coordinates[0];
      var nPts = pts.length;
      var x=0;
      var y=0;
      var f, p1, p2;
      var j=nPts-1;
      for(var i=0;i<nPts;j=i++){
        p1={x: pts[i][0], y: pts[i][1] };
        p2={x: pts[j][0], y: pts[j][1] };
        f=p1.x*p2.y-p2.x*p1.y;
        x+=(p1.x+p2.x)*f;
        y+=(p1.y+p2.y)*f;
      }
      f=poly_area(pts)*6;
      return [ x/f, y/f ];
    };
    for(var t=0;t<tracts[0].length;t++){
      d3.select(tracts[0][t]).attr("d", geopath.projection( d3.geo.mercator().scale(24000000).center( centroid(graph.geometries.features[t].geometry) ) ) );
    }
    
    var node = svg.selectAll("circle.node")
      .data(graph.nodes)
      .enter().append("circle")
      .attr("class", function(d){ return "node d" + d.name })
      .attr("r", 5)
      .style("fill", function(d) { return color(d.group); })
      .call(force.drag);

    //node.append("title")
    //  .text(function(d) { return d.name; });

    force.on("tick", function() {
      node.attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; });
    
      // center tracts on dot
      tracts.attr("transform", function(d){
        var matchCircle = svg.select(".dgr" + d.properties.INDEX);
        return "translate(" + (matchCircle[0][0].cx.baseVal.value - 480) + "," + (matchCircle[0][0].cy.baseVal.value - 250) + ")";
      });
    });
  });
});

function showDataSource(){
  $("#creditmessage").modal("toggle");
}
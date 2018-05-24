var version_list = [];
var chosenArray = new Array();

function parse_query_string(query) {
  var vars = query.split("&");
  var query_string = {};
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split("=");
    // If first entry with this name
    if (typeof query_string[pair[0]] === "undefined") {
      query_string[pair[0]] = decodeURIComponent(pair[1]);
      // If second entry with this name
    } else if (typeof query_string[pair[0]] === "string") {
      var arr = [query_string[pair[0]], decodeURIComponent(pair[1])];
      query_string[pair[0]] = arr;
      // If third or later entry with this name
    } else {
      query_string[pair[0]].push(decodeURIComponent(pair[1]));
    }
  }
  return query_string;
}

var url_string = window.location.href;
var url = new URL(url_string);
console.log(url)
var params = parse_query_string(url.search);
console.log("recovery_name: " + params.recovery);
console.log("ver1: " + params.ver1);
console.log("ver2: " + params.ver2);
console.log("target_sub: " + params.target_sub);

function renderGraph() {
  loadGraph_comparison(params.chosen_1, params.chosen_2)
}


function getPosition_comparison(string, subString, index) {
        return string.split(subString, index).join(subString).length;
      }

function getAllNodes_comparison(root) {
  var nodes = [];

  root.forEach(function(d) {
    d.children.forEach(function(d){
      nodes.push(d);
    });
  });
  return nodes;
}

function getDifference_comparison(nodes) {
  var moved = [];
  nodes.forEach(function(d) {
    if (d.data.moved) {
      var target_node = findTargetNode_comparison(nodes, d);
      moved.push({source: d, target: findTargetNode_comparison(nodes, d)});
    }  
  });
  return moved;
};

function findTargetNode_comparison(nodes, source){
  var target_node;
  nodes.forEach(function(d) {
    if (d.name == source.name){
      if (d.parent.name != source.parent.name){
        target_node = d;
      }
    };
  });
  return target_node;
};
  
function loadGraph_comparison(version1, version2) {
      $("#partial_title").html(params.software)
      $("#svg_comparison").attr("width", window.innerWidth*0.8);

      var svg = d3.select("#svg_comparison"),
          width = +svg.attr("width"),
          height = +svg.attr("height");

      var defs = svg.append("svg:defs");

      defs.append("svg:marker")
          .attr("id", "arrow")
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 8) // This sets how far back it sits, kinda
          .attr("refY", 0)
          .attr("markerWidth", 9)
          .attr("markerHeight", 9)
          .attr("orient", "auto")
          .attr("markerUnits", "userSpaceOnUse")
          .append("svg:path")
          .attr("d", "M0,-5L10,0L0,5")
          .style("fill", "white");

      var format = d3.format(",d");
      var color = d3.scaleSequential();
      var pack = d3.pack()
          .size([width, height])
          .padding(1.5);
      var link = svg.append("g").selectAll(".link");

      file_name = "../Back-end/Data/Pairwise/" + params.software + "/" + params.recovery + "/pairwise_" + params.chosen_1.toString() + "_" + params.chosen_2.toString() +  ".json";

      d3.json(file_name, function(error, root) {
        if (error) throw error;
        version_list = [params.chosen_1, params.chosen_2]

        root = d3.hierarchy(root)
                  .sum(function(d) { return d.size; })
                  .each(function(d) {
                    if (name = d.data.name) {
                      var name, i = name.lastIndexOf(".");
                      d.name = name;
                      d.package = name.slice(0, i);
                      d.class = name.slice(i+1);
                    }
                  });

        
        $("#current_ver").val(params.chosen_1)
        // $("hist_btn").setAttribute("onclick", "showHistory("+$('#current_ver').)

        $("#version_list").append(
          "<li class='ver_list active' version='"+params.chosen_1+"' id='ver"+params.chosen_1.replace(/\./i, '').replace(/\s/g, '')+ "'><a href='#' id='"+params.chosen_1.replace(/\./i, '').replace(/\s/g, '')+"_btn' style='text-align: left; padding-left: 10px;' onclick='showSingleVersion(&#39;"+params.chosen_1+"&#39;, "+2+")'>Version "+ params.chosen_1 + "</a></li>"          
        )
        $("#version_list").append(
          "<li class='ver_list' version='"+params.chosen_2+"' id='ver"+params.chosen_2.replace(/\./i, '').replace(/\s/g, '')+ "'><a href='#' id='"+params.chosen_2.replace(/\./i, '').replace(/\s/g, '')+"_btn' style='text-align: left; padding-left: 10px;' onclick='showSingleVersion(&#39;"+params.chosen_2+"&#39;, "+2+")'>Version "+ params.chosen_2 + "</a></li>"
        )
        $("#version_list").append(
            "<li class='ver_list' version='' id='diff'><a href='#' style='text-align: left; padding-left: 10px;' id='diff_btn' onclick='showDifference_comparison()' >Difference</a></li>"
        )

        // set color spectrum
        // console.log(root.data.package_list)
        color.domain([root.data.package_list.length, 0]);
        color.interpolator(d3.interpolateSpectral);

        // set circle color depending on the directory
        // for (i=0; i<package_list.length; i++) {
        for (i=0; i<root.data.package_list.length; i++){
          $("#package_list").append(
            "<li class='color_list'>"  
              + "<div class='list_circle' style=' display: inline-block; background-color: " + color(i) + ";'></div>"
              + "<div style='display: inline-block; '>" + root.data.package_list[i] + "</div>"
          + "</li>\n");
        }

        var nodes = getAllNodes_comparison(root.children);
        var plinks = getDifference_comparison(nodes);

        // relax clusters
        var cluster = svg.selectAll(".cluster")
            .data(pack(root).children)
            .enter().append("g")
            .attr("class", "cluster")
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

        // draw circles for clusters
        cluster.append("circle")
                .attr("name", function(d) { return d.name; })
                .attr("r", function(d) { return d.r; })
                .style("fill", "white")
                .style("opacity", "0.2");

        // write cluster names
        cluster.append("text")
               .attr("class", "cluster_name")
               .attr("transform", function(d) { 
                if( d.y - d.r < 17){ return "translate(" + -d.r/6*5 + "," + -d.r/6*5 + ")"; }
                else { return "translate(" + 0 + "," + -d.r + ")"; }
                })
               .selectAll("tspan")
               .data(function(d) { return d.name; })
               .enter().append("tspan")
               .text(function(d) { return d; })
               .style("font-size", "15px")
               .style("fill", "white")

        var node = svg.selectAll(".node")
          .data(pack(root).leaves())
          .enter().append("g")
            .attr("class", "node")
            .attr("version", function(d) { return d.data.version; })
            .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });

        node.append("circle")
            .attr("name", function(d) { return d.name; })
            .attr("r", function(d) { return d.r; })
            .style("fill", function(d) { 
              var start_idx = getPosition_comparison(d.data.name, ".", root.data.package_level-1)+1;
              var end_idx = getPosition_comparison(d.data.name, ".", root.data.package_level);
              var package_name = d.data.name.slice(start_idx, end_idx);
              // return color(root.data.package_list.indexOf(package_name));
              return color(root.data.package_list.indexOf(package_name));
            })
            .style("opacity", function(d){
              if (!d.data.version_1) {
                return "0.2";
              }
            })
            .on("mouseover", function(d) {
              if (!$("#show_arrow").is(':checked')) {
                var cur_node = d.data.name;
                var link = svg.selectAll("line.node");
                link.style("visibility", function(d){
                  if (d.source.name == cur_node)
                    return "visible";
                  else
                    return "hidden";
                })
              }
            })
            .on("mouseout", function(d) {
              if (!$("#show_arrow").is(':checked'))
              svg.selectAll("line.node").style("visibility", "hidden");
            });

        node.append("clipPath")
            .attr("name", function(d) { return "clip-" + d.name; })
            .append("use")
            .attr("xlink:href", function(d) { return "#" + d.name; });

        node.append("text")
            .attr("class", "comp_name")
            .style("visibility", "hidden")
            .attr("clip-path", function(d) { return "url(#clip-" + d.name + ")"; })
            .selectAll("tspan")
            .data(function(d) { return d.class.split(/(?=[A-Z][^A-Z])/g); })
            .enter().append("tspan")
            .attr("x", 0)
            .attr("y", function(d, i, nodes) { return 9 + (i - nodes.length / 2 - 0.5) * 7; })
            .text(function(d) { return d; })
            
        node.append("text")
            .attr("class", "comp_diff")
            .style("display", "none")
            // .style("visibility", "hidden")
            .selectAll("tspan")
            .data(function(d) { return d.data.diff;})
            .enter().append("tspan")
            .attr("x", 0)
            .attr("y", 4)
            .text(function(d) { return d;})
            .style("font-size", "15px");

        node.append("title")
            .text(function(d) { return d.name; });

      // draw component change arrows
       var links = svg.selectAll("line.node")
                  .data(plinks)
                  .enter()
                  .append("line")
                  .attr("x1", function(d) { return d.source.x; })
                  .attr("y1", function(d) { return d.source.y; })
                  .attr("x2", function(d) { return d.target.x; })
                  .attr("y2", function(d) { return d.target.y; })
                  .attr("class", "node")
                  .style("stroke", "#fff")
                  .style("stroke-width", 2)
                  .attr("x", function(d) { return d.source.name; })
                  .attr("y", function(d) { return d.target.name; })
                  .style("visibility", "hidden")
                  .attr("marker-end", "url(#arrow)");

      });

    }
// });


var compare_versions = [0, 0, 0];

function getXOR(a,b) {
  return (a||b)&&!(a&&b);
}

function add(a,b) {
  return a+b;
}
function showSingleVersion(version, num_ver) {
  $(".comp_diff").css("visibility", "hidden");
        var svg = d3.select("#svg_comparison");
        var list_id = "#ver" + version.replace(/\./i, '').replace(/\s/g, '');
        $(".ver_list").removeClass("active");
        $(list_id).addClass("active");

        var node = svg.selectAll(".node");

        if (version.replace(/\./i, '').replace(/\s/g, '') == chosenArray[0]) {
          node.selectAll("circle")
          .style("opacity", function(d) {
          if (!d.data.version_1){
            return "0.2";
          }
          else{
            return "1";
          }
          });  
        }
        else {
          node.selectAll("circle")
          .style("opacity", function(d) {
          if (!d.data.version_2){
            return "0.2";
          }
          else{
            return "1";
          }
          });
        }
}
function compare2Versions() {
  is_selecting = false;
  $("#svg_history").css("display", "none");
  $(".option").css("display", "none");
  $("#diff").css("display", "block");

  chosenArray = new Array();
  $("li[class*='chosen']").each(function(){
      chosenArray.push($(this).attr("version").replace(/\./i, '').replace(/\s/g, ''));
  });

  loadGraph_comparison(chosenArray[0], chosenArray[1]);
  $("#svg_comparison").css("display", "block");
  $("#compare_btn").css("display", "none");
  $("#back_btn").css("display", "block");

  $("#diff").css("display", "block");

  is_comparing = true;
  var ver1_id = "#ver" + chosenArray[0].replace(/\./i, '').replace(/\s/g, '');
  $(ver1_id).addClass("active");

  $("#issue_title").css("display", "None");
  $("#label_box").css("display", "None");
  $("#issue_box").css("display", "None");
  $("#desc_box").css("display", "None");
}

function back2History() {
  window.location.href = location.href.split('pairwise.html')[0] + 'single_layered.html?&recovery=' + params.recovery +'&ver1=' + params.ver1 + '&ver2=' + params.ver2 + '&ver3=' + params.ver3 + '&software=' + params.software

}

function showDifference_comparison(){
  var svg = d3.select("#svg_comparison");
  var ver1_id = "#ver" + params.chosen_1.replace(/\./i, '').replace(/\s/g, '');
  var ver2_id = "#ver" + params.chosen_2.replace(/\./i, '').replace(/\s/g, '');
  $(ver1_id).removeClass("active");
  $(ver2_id).removeClass("active");
  $("#diff").addClass("active");

  var node = svg.selectAll(".node");

  node.selectAll("circle")
    .style("opacity", function(d) {
      if (d.data.version_1 == d.data.version_2){
        return "0.2";
      }
      else {
        return "1";
      }
    })         

    $(".comp_diff").css("visibility", "visible");
    $(".comp_diff").css("display", "block");
};
var version_colors = ["orange", "gold", "lightpink"];

var affine_angle = 0.3;
var num_ver = 3;
var cur_idx = 0;

var arrow_x = [-300, -50, 200];
var arrow_y = [30, 10, -10];
var layer_history_x = ["-=150", "-=25", "+=100"];
var node_history_x = ["-=300", "-=50", "+=200"];
var layer_history_y = ["+=15", "+=5", "-=5"];
var node_history_y = ["+=30", "+=10", "-=10"];

var reverse_layer_history_x = ["+=150", "+=25", "-=100"];
var reverse_node_history_x = ["+=300", "+=50", "-=200"];
var reverse_layer_history_y = ["-=15", "-=5", "+=5"];
var reverse_node_history_y = ["-=30", "-=10", "+=10"];

var tl = new TimelineMax();

var viewMode = 'Single';

var is_selecting = false;
var is_comparing = false;

var version_list = [];
var start_version;

var chosenArray = new Array();

var color = d3.scaleSequential();
var package_list;

var url_string = window.location.href;
var url = new URL(url_string);
var params = parse_query_string(url.search);
var input_file_name = "../Back-end/Data/Processed_Architecture/" + params.software + "/" + params.recovery + "/" + params.ver1 + "_" + params.ver2 + "_" + params.ver3 + "/processed_archs.json"
var compare_versions = [0, 0, 0];

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

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds){
      break;
    }
  }
}

function changeMode(mode) {
  if      (mode == 'History')       viewMode = 'History';
  else if (mode == 'Single')        viewMode = 'Single';
}

function renderGraph() {
  $(".table_index>a").attr('href', function() {
    return location.href.split('index_combined.html')[0] + 'index_combined.html?&recovery=' + params.recovery +'&ver1=' + params.ver1 + '&ver2=' + params.ver2 + '&layer=' + $(this).attr("layer") + '&target_sub=' + $(this).attr("package")
    // return 'http://localhost:8888/EVA/Front-end/index_combined.html?&recovery=' + params.recovery +'&ver1=' + params.ver1 + '&ver2=' + params.ver2 + '&layer=' + $(this).attr("layer") + '&target_sub=' + $(this).attr("package")
  })  
  $(".recovery_btn").attr("onclick", function() {
    return "window.open('" + location.href.split('index_combined.html')[0] + params.recovery + ".html')"
    // return "window.open('http://localhost:8888/EVA/Front-end/" + params.recovery + ".html')"
  })

  // set svg width to be responsive
  $("#svg_history").attr("width", window.innerWidth*0.8);
  $("#svg_history").attr("height", window.innerHeight*0.9);

  var svg = d3.select("#svg_history"),
      width = +svg.attr("width"),
      height = +svg.attr("height");

  var defs = svg.append("svg:defs");

  defs.append("svg:marker")
      .attr("id", "arrow")
      .attr("orient", "auto")
      .attr("markerUnits", "userSpaceOnUse")
      .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5")
      .style("fill", "white");

  var format = d3.format(",d");
  var pack = d3.pack()
      .size([width, height])
      .padding(1.5);
  var link = svg.append("g").selectAll(".link");

  // read json file & make hierarchy
  d3.json(input_file_name, function(error, root) {
    if (error) throw error;
    version_list = root.version_list;
    for (i=0; i<num_ver; i++) {
      var print_version = root.version_list[i]
      var version_id = "ver" + print_version.replace(/\./g, '').replace(/\s/g, '');
      $("#partial_title").html(params.software)
      $("#version_list").append(
        "<li class='ver_list' version='"+print_version+"' id='"+version_id+ "'><a href='#' id='"+version_id+"_btn' style='text-align: left; padding-left: 10px;' onclick='showSingleVersion(&#39;"+print_version+"&#39;, "+num_ver+")'>Version "+ print_version + "</a></li>"
      )
    }
    for (i=0; i<num_ver-1; i++){
      var version_id = "ver" + root.version_list[i].replace(/\./g, '').replace(/\s/g, '');
      $("#hist_version_list").append(
        "<li class='hist_ver_list' version='"+root.version_list[i]+"' id='hist_"+version_id+ "' style='display:none;'><a href='#' id='hist_"+version_id+"_btn' style='text-align: left; padding-left: 40px;' onclick='showArchChange(&#39;"+root.version_list[i]+"&#39;, "+num_ver+")'>Architectural Changes "+ root.version_list[i] + " &#8594 " + root.version_list[i+1] + "</a></li>"
        )
    }
    $("#current_ver").val(root.version_list[0])
    $("#version_list").append(
        "<li class='ver_list chosen' version='' id='diff' style='display:none;'><a href='#' style='text-align: left; padding-left: 10px;' id='diff_btn' onclick='showDifference_comparison()' >Difference</a></li>"
    )
    start_version = version_list[0];
    showSingleVersion(version_list[0], num_ver);
    
    // set color spectrum
    color.domain([root.package_list.length, 0]);
    color.interpolator(d3.interpolateSpectral);

    // set circle color depending on the directory
    for (i=0; i<root.package_list.length; i++){
      if (root.package_list[i] == 'leaf'){
        $("#package_list").append(
        "<li class='color_list'>"  
          + "<div class='list_circle' style='display: none; background-color: " + color(i) + ";'></div>"
          + "<div class='list_index' style='display: none; '>" + params.target_sub + "</div>"
          + "</li>\n");
      }
      else {
        $("#package_list").append(
        "<li class='color_list'>"  
          + "<div class='list_circle' style='display: none; background-color: " + color(i) + ";'></div>"
          + "<div class='list_index' style='display: none; '>" + root.package_list[i] + "</div>"
          + "</li>\n");
      } 
    }

    for (v=0; v<num_ver; v++){
      $("#cluster_list_ver"+v).html(root.version_list[v]);
      $("#cluster_list_ver"+v).css("font-weight", "bold");
      $("#cluster_list_ver"+v).css("font-size", "18px");
      for (i=0; i<root.children[v].clusters.length; i++){
        if (root.children[v].clusters[i] == "dummy") {
          continue
        }
        $("#cluster_list"+v).append(
          "<li class='color_list'>"  
            + "<div class='list_circle' style='display: none; background-color: #ffffff;'></div>"
            + "<div class='list_index' style='display: none;'> <a href='" + location.href.split('index_combined.html')[0] + "index_single.html?&recovery=" + params.recovery + "&ver1=" + params.ver1 + "&ver2=" + params.ver2 + "&single=" + root.version_list[v] + "&layer=" + params.layer + "&target_sub=" + root.children[v].clusters[i] + "'>" + root.children[v].clusters[i] + "</a></div>"
        + "</li>\n");
      }
    }

    package_list = root.package_list;

    var ver_root = [];
    var layers = [];

    for (var i=0; i<num_ver; i++) {
      ver_root[i] = d3.hierarchy(root.children[i])
                      .sum(function(d) { return d.size ? 1 : 0; })
                      .sort(function(a, b) {
                        return b.height - a.height || b.data.sort - a.data.sort;
                      })
                      // .sort(function(a, b) { 
                      //   if (params.recovery == 'acdc') return b.data.name.toLowerCase() > a.data.name.toLowerCase() || b.data.sort - a.data.sort ;
                      //   else  return b.height - a.height || b.value - a.value; })
                      .each(function(d) {
                        if (name = d.data.name) {
                          var name, i = name.lastIndexOf(".");
                          d.name = name;
                          d.package = name.slice(0, i);
                          d.class = name.slice(i+1);
                        }
                      });
    }

    var clusters = []
    for (var i=0; i<num_ver; i++) {
      var cluster_class = "cluster cluster" + i + " layer" + i;
      clusters[i] = svg.selectAll(cluster_class)
                       .data(pack(ver_root[i]).children)
                       .enter().append("g")
                       .attr("class", function(d) {
                          if (d.data.change == -1)  return cluster_class + " dummy_cluster";
                          else return cluster_class; })
                       .attr("transform", function(d) { 
                          return "translate(" + parseFloat(d.x)  + "," + parseFloat(d.y) + ")"; })
                       .style("visibility", function(d){
                          if (version_list[i] != cur_idx) {
                            return "hidden";}
                          else if (d.data.change == -1) {
                            return "hidden";}
                          else {
                            return "visible";}
                       });
      clusters[i].append("circle")
                 .attr("class", "layer layer"+i)
                 .attr("name", function(d) {
                  return d.name; })
                 .attr("r", function(d) { return d.r; })
                 .style("fill", d3.color(version_colors[i]))
                 .style("opacity", "0.1")

      // write cluster names
      clusters[i].append("text")
                 .attr("class", "cluster_name")
                 .attr("transform", function(d) { 
                  if( d.y - d.r < 17){
                    return "translate(" + -d.r/6*5 + "," + -d.r/6*5 + ")"; }
                  else {
                    return "translate(" + 0 + "," + -d.r + ")";}
                 })
                 .selectAll("tspan")
                 .data(function(d) { return d.name.split(/(?=[A-Z][^A-Z])/g); })
                 .enter().append("tspan")
                 .text(function(d) { return d; })
                 .style("font-size", "15px")
                 .style("fill", "white")
                 .style("opacity", "0");
    }

    var cur_cluster = svg.selectAll(".cluster0");
    cur_cluster.selectAll("circle")
    .style("opacity", function(d) {
        return "0.1";
    });
    cur_cluster.selectAll("text")
    .style("opacity", function(d) {
        return "1";
    });
    $(".cluster0>text>tspan").css("opacity", "1");

    var ver_nodes = []
    for (var i=0; i<num_ver; i++){
      var nodes_class = "node node" + i;

      ver_nodes[i] = svg.selectAll(nodes_class)
                        .data(pack(ver_root[i]).leaves())
                        .enter().append("g")
                        .attr("class", function(d) {
                          if (d.data.change == -1) return nodes_class + " dummy_node";
                          else return nodes_class; })
                        .attr("version", function(d) { return d.data.version; })
                        .attr("cluster", function(d) { return d.data.cluster; })
                        .attr("transform", function(d) {
                        return "translate(" + parseFloat(d.x)  + "," + parseFloat(d.y) + ")"; })
                        .attr("from", function(d) {return d.data.from;})
                        .attr("diff", function(d) {
                          return ('diff' in d.data); })
                        .style("visibility", function(d){
                          if (d.data.version != start_version) {
                            return "hidden";
                          }
                          if (d.data.change == -1) {
                            return "hidden";
                          }
                        })

      // draw circles for components
      ver_nodes[i].append("circle")
                  .attr("name", function(d) { return d.name; })
                  .attr("r", function(d) { return d.r; })
                  .style("fill", function(d) {
                    var start_idx = getPosition(d.data.name, ".", ver_root[i].data.package_level-1)+1;
                    var end_idx = getPosition(d.data.name, ".", ver_root[i].data.package_level);
                    var package_name = d.data.name.slice(start_idx, end_idx);
                    
                    if (package_list.indexOf(package_name) == -1) return color(package_list.indexOf("leaf"))
                    else  return color(package_list.indexOf(package_name));
                  })
                  .attr("color", function(d) {
                    var start_idx = getPosition(d.data.name, ".", ver_root[i].data.package_level-1)+1;
                    var end_idx = getPosition(d.data.name, ".", ver_root[i].data.package_level);
                    var package_name = d.data.name.slice(start_idx, end_idx);
                    if (package_list.indexOf(package_name) == -1) return color(package_list.indexOf("leaf"))
                    else  return color(package_list.indexOf(package_name));
                  })
                  .style("opacity", function(d){
                    if (d.data.version != start_version) {
                      return "0.2";
                    }
                  })
                  .on("mouseover", function(d) {
                      type_dict = ['Enhancement', 'Bug', 'Documentation', 'Performance', 'Test', 'Feature', '*Enhancement', '*Bug', '*Documentation', '*Performance', '*Test', '*Feature']
                      var issue_desc = "";
                      if ('titles' in d.data) { $("#issue_box").text(d.data.titles); }
                      if ('bodys' in d.data) { $("#desc_box").text(d.data.bodys); }
                      else { $("#desc_box").text("Description"); }
                      if ('labels' in d.data) { $("#label_box").text(type_dict[parseInt(d.data.labels[0])]) }
                      if ($("#show_history").is(':checked')) {
                        var cur_node = d;
                        var link = svg.selectAll("line.node");
                        link.style("visibility", function(d){
                          if (d.source.name == cur_node.data.name) {
                            return "visible";
                          }
                          else
                            return "hidden";
                        })
                        var node = svg.selectAll(".node");
                        node.style("opacity", function(d) {
                          if (d.name == cur_node.data.name){
                            return "1";
                          }
                          else
                            return "0.2";
                        })
                      }
                  })
                  .on("mouseout", function(d) {
                    var cur_node = d;
                    if ($("#show_history").is(':checked'))
                    svg.selectAll("line.node").style("visibility", "hidden");
                    sleep(80)
                    svg.selectAll(".node").style("opacity", function(d) {
                        return "1";});
                  });
      showColor();

      ver_nodes[i].append("clipPath")
                  .attr("name", function(d) { return "clip-" + d.name; })
                  .append("use")
                  .attr("xlink:href", function(d) { return "#" + d.name; });

      ver_nodes[i].append("text")
                  .attr("class", "comp_name")
                  .style("visibility", "hidden")
                  .attr("clip-path", function(d) { return "url(#clip-" + d.name + ")"; })
                  .selectAll("tspan")
                  .data(function(d) { 
                    if(d.class == undefined) return "";
                    else return d.class.split(/(?=[A-Z][^A-Z])/g); })
                  .enter().append("tspan")
                  .attr("x", 0)
                  .attr("y", function(d, i, nodes) { return 9 + (i - nodes.length / 2 - 0.5) * 7; })
                  .text(function(d) { return d; })

      ver_nodes[i].append("text")
                    .attr("class", "comp_issue")
                    .selectAll("tspan")
                    .data(function(d) { 
                      if (d.data["titles"] == undefined) return '';
                      else if (d.data["titles"].length > 0) return "i";
                      else return ''; })
                    .enter().append("tspan")
                    .attr("x", 0)
                    .attr("y", 4)
                    .text(function(d) { return d;})
                    .style("font-size", "13px")
                    .style("fill", "white");
          
      ver_nodes[i].append("text")
                  .attr("class", "comp_diff")
                  .style("visibility", "hidden")
                  .selectAll("tspan")
                  .data(function(d) { 
                    if ('diff' in d.data)
                      return d.data.diff;
                    else
                      return '';
                  })
                  .enter().append("tspan")
                  .attr("x", 0)
                  .attr("y", 4)
                  .text(function(d) { return d;})
                  .style("font-size", "15px")
                  .style("fill", "white");

            ver_nodes[i].append("text")
                    .attr("class", "add_remove")
                    .style("visibility", "hidden")
                    .selectAll("tspan")
                    .data(function(d) { 
                      if (d.data.change == 4) return '';
                      else if (d.data.change == 5) return "";
                      else return ''; })
                    .enter().append("tspan")
                    .attr("x", 0)
                    .attr("y", 4)
                    .text(function(d) { return d;})
                    .style("font-size", "13px")
                    .style("fill", "white");


      ver_nodes[i].append("title")
                  .text(function(d) { return d.name; });
      
    }

    var nodes = [];
    for (var i=0; i<num_ver; i++){
      nodes.push(getAllNodes(ver_root[i]));
    }

    var plinks = [];
    for (var i=1; i<num_ver; i++){
      plinks.push(getDifference(nodes[i], nodes[i-1]));
    }

    var concat_links = [];

    for (i=0; i<num_ver-1; i++) {
      concat_links = concat_links.concat(plinks[i]);
    }

  // draw component change arrows
   var links = svg.selectAll("line.node")
                  .data(concat_links)
                  .enter()
                  .append("line")
                  .attr("x1", function(d) {
                    var affined_x = parseFloat(d.source.x) + arrow_x[version_list.indexOf(d.source.data.version)];
                    return affined_x; })
                  .attr("y1", function(d) {
                    var affined_y = parseFloat(d.source.y) + arrow_y[version_list.indexOf(d.source.data.version)];
                    return affined_y;})
                  .attr("x2", function(d) { 
                    var affined_x = parseFloat(d.target.x) + arrow_x[version_list.indexOf(d.target.data.version)];
                    return affined_x; })
                  .attr("y2", function(d) { 
                    var affined_y = parseFloat(d.target.y) + arrow_y[version_list.indexOf(d.target.data.version)];
                    return affined_y; })
                  .attr("class", "node")
                  .style("stroke", "#fff")
                  .style("stroke-width", 2)
                  .style("visibility", "hidden")
                  .attr("marker-end", "url(#arrow)");

  });
}


function showColor(){
  if ($("#show_color").is(':checked')) {
    $(".list_circle").css("display", "inline-block");
    $(".list_index").css("display", "inline-block");
  }
  else {
    $(".list_circle").css("display", "none");
    $(".list_index").css("display", "none");
  }
}


function changeAngle(mode){

  if(mode == 'History') {
    $(".cluster>text").css("opacity", "0");  
    $(".cluster0>text").css("opacity", "1");
    tl.to($('.layer0'), 0.1, {x:layer_history_x[0], y:layer_history_y[0]});
    tl.to($('.node0'), 0.1, {x:node_history_x[0], y:node_history_y[0]});
    tl.to($('.layer0>text'), 0.1, {x:layer_history_x[0], y:layer_history_y[0]});
    
    tl.to($('.layer1'), 0.1, {x:layer_history_x[1], y:layer_history_y[1]});
    tl.to($('.node1'), 0.1, {x:node_history_x[1], y:node_history_y[1]});
    tl.to($('.layer1>text'), 0.1, {x:layer_history_x[1], y:layer_history_y[1]});
     
    tl.to($('.layer2'), 0.1, {x:layer_history_x[2], y:layer_history_y[2]});
    tl.to($('.node2'), 0.1, {x:node_history_x[2], y:node_history_y[2]});
    tl.to($('.layer2>text'), 0.1, {x:layer_history_x[2], y:layer_history_y[2]});
    
    $('.layer2').css("visibility", "visible");
    $('.node2').css("visibility", "visible");
    $('.layer1').css("visibility", "visible");
    $('.node1').css("visibility", "visible");
    $('.layer0').css("visibility", "visible");
    $('.node0').css("visibility", "visible");
    $('.dummy_node').css("visibility", "hidden");
    $('.dummy_cluster').css("visibility", "hidden");
  }

  else {
    tl.to($('.layer0'), 0.1, {x:reverse_layer_history_x[0], y:reverse_layer_history_y[0]});
    tl.to($('.node0'), 0.1, {x:reverse_node_history_x[0], y:reverse_node_history_y[0]});
    tl.to($('.layer0>text'), 0.1, {x:reverse_layer_history_x[0], y:reverse_layer_history_y[0]});

    tl.to($('.layer1'), 0.1, {x:reverse_layer_history_x[1], y:reverse_layer_history_y[1]});
    tl.to($('.node1'), 0.1, {x:reverse_node_history_x[1], y:reverse_node_history_y[1]});
    tl.to($('.layer1>text'), 0.1, {x:reverse_layer_history_x[1], y:reverse_layer_history_y[1]});

    tl.to($('.layer2'), 0.1, {x:reverse_layer_history_x[2], y:reverse_layer_history_y[2]});
    tl.to($('.node2'), 0.1, {x:reverse_node_history_x[2], y:reverse_node_history_y[2]});
    tl.to($('.layer2>text'), 0.1, {x:reverse_layer_history_x[2], y:reverse_layer_history_y[2]});

    $('.layer2').css("visibility", "hidden");
    $('.node2').css("visibility", "hidden");
    $('.node1').css("visibility", "hidden");
    $('.layer1').css("visibility", "hidden");
    $('.layer0').css("visibility", "hidden");
    $('.node0').css("visibility", "hidden");

    $('.node'+cur_idx.toString()).css("visibility", "visible");
    $('.layer'+cur_idx.toString()).css("visibility", "visible");
    $('.dummy_node').css("visibility", "hidden");
    $('.dummy_cluster').css("visibility", "hidden");
  }
}

function showArrow(){
  var svg = d3.select("#svg_history");
  var link = svg.selectAll("line.node");
  if ($("#show_arrow").is(':checked'))
    link.style("visibility", "visible");
  else
    link.style("visibility", "hidden");
}

function getXOR(a,b) {
  return (a||b)&&!(a&&b);
}

function add(a,b) {
  return a+b;
}

function showSingleVersion(version, num_ver) {
  $(".add_remove").css("visibility", "hidden")
  if (is_selecting) {
    var list_id = "#ver" + version.replace(/\./g, '').replace(/\s/g, '');
    if ($(list_id).hasClass("chosen")) {
      $(list_id).removeClass("chosen");
      $(list_id).addClass("option");
    }
    else {
      $(list_id).removeClass("option");
      $(list_id).addClass("chosen");  
    }
    
    compare_versions[version_list.indexOf(version)] = getXOR(compare_versions[version],1)
    if (compare_versions.reduce(add, 0) == 2) {
      $("#compare_btn").removeAttr("disabled");
    }
    else {
      $("#compare_btn").attr("disabled", "disabled");
    }
  }

  else {
    cur_idx = version;
    if (viewMode == 'History') {
      changeAngle("Single");  
    }
    changeMode("Single");
    $("#current_ver").val(version);

    $("#show_history").prop("checked", false);

    var cluster_class = ".cluster" + version_list.indexOf(version);
    var node_class = ".node" + version_list.indexOf(version);
    var list_id = "#ver" + version.toString().replace(/\./g, '').replace(/\s/g, '');

    var all_cluster = ".cluster";
    var all_node = ".node";

    $(all_cluster).css("visibility", "hidden");
    $(all_node).css("visibility", "hidden");

    $(cluster_class).css("visibility", "visible");
    $(node_class).css("visibility", "visible");
    $('.dummy_node').css("visibility", "hidden");
    $('.dummy_cluster').css("visibility", "hidden");
    $(cluster_class).css("opacity", "1");
    $(node_class).css("opacity", "1");

    $(".comp_diff").css("visibility", "hidden");
    var svg = d3.select("#svg_history");

    $(".ver_list").removeClass("active");
    $(list_id).addClass("active");
    $(".hist_ver_list").removeClass("active");
    $(".hist_ver_list").css("display", "none");


    $(".node circle").attr("style", function(){
      return "fill: " + $(this).attr("color");
      
    });

    var all_cluster = svg.selectAll(".cluster");
    all_cluster.selectAll("circle")
    .style("opacity", function(d) {
        return "0";
    });
    all_cluster.selectAll("text")
    .style("opacity", function(d) {
        return "0";
    });
    var cur_cluster = svg.selectAll(cluster_class);
    cur_cluster.selectAll("circle")
    .style("visibility", "visible")
    .style("opacity", function(d) {
        return "0.1";
    });
    cur_cluster.selectAll("text")
    .style("opacity", function(d) {
        return "1";
    })
    cur_cluster.selectAll("tspan")
    .style("opacity", "1");

    var all_node = svg.selectAll(".node");

    all_node.selectAll("circle")
      .style("opacity", function(d) {
        return "0.2";
    });

    var cur_node = svg.selectAll(node_class);

    cur_node.selectAll("circle")
      .style("opacity", function(d) {
        return "1";
    });

    var issue_text = svg.selectAll(".comp_issue");
    issue_text.style("opacity", function(d) {
      if (d.data.version == version)
        return "1";
      else
        return "0.7";
    })
  }
  $('.dummy_node').css("visibility", "hidden");
    $('.dummy_cluster').css("visibility", "hidden");

}


function showHistory() {
  $(".add_remove").css("visibility", "hidden")
  if(viewMode != "History") {

    $(".ver_list").removeClass("active");
    $(".hist_ver_list").removeClass("active");
    $("#history").addClass("active");
    changeAngle("History");

    version = $("#current_ver").val()
    var cluster_class = ".cluster" + version_list.indexOf(version);
    var layer_class = ".layer" + version_list.indexOf(version);
    var node_class = ".node" + version_list.indexOf(version);
    var list_id = "#ver" + version.toString().replace(/\./g, '').replace(/\s/g, '');

    $(".cluster").css("opacity", "0.2");
    $(".layer").css("opacity", "0.2");
    $(".comp_issue").css("opacity", "0.2");

    $(cluster_class).css("opacity", "1");
    $(layer_class+">circle").css("opacity", "0.2");
    $(cluster_class+">text").css("opacity", "1");
    $(cluster_class+">text>tspan").css("opacity", "1");
    $(node_class+">.comp_issue").css("opacity", "1");
    $(node_class).css("stroke", "none");

    $(".hist_ver_list").css("display", "block");

    changeMode("History");
    $("#show_history").prop("checked", true);
    $(".cluster_name").css("opacity", "1");
    $(".cluster_name>tspan").css("opacity", "1");
  }
  else {

    $(".ver_list").removeClass("active");
    $(".hist_ver_list").removeClass("active");
    $("#history").addClass("active");

    version = $("#current_ver").val()
    var cluster_class = ".cluster" + version_list.indexOf(version);
    var layer_class = ".layer" + version_list.indexOf(version);
    var node_class = ".node" + version_list.indexOf(version);
    var list_id = "#ver" + version.toString().replace(/\./g, '').replace(/\s/g, '');

    $(".cluster").css("opacity", "0.2");
    $(".layer").css("opacity", "0.2");
    $(".comp_issue").css("opacity", "0.2");
    $(".node").css("opacity", "1");
    $(".node>circle").css("stroke", "none");
    $(".node>circle").css("opacity", "0.2");


    $(cluster_class).css("opacity", "1");
    $(layer_class+">circle").css("opacity", "0.2");
    $(cluster_class+">text").css("opacity", "1");
    $(cluster_class+">text>tspan").css("opacity", "1");
    $(node_class+">.comp_issue").css("opacity", "1");
    $(node_class+">circle").css("stroke", "none");
    $(node_class+">circle").css("opacity", "1");

  }
}

function showArchChange(version, num_ver) {
  var list_id = "#hist_ver" + version.replace(/\./g, '').replace(/\s/g, '');
  $(".ver_list").removeClass("active");
  $(".hist_ver_list").removeClass("active");
  $(list_id).addClass("active");

  // var cluster_class = ".cluster"
  // var node_class = ".node"
  var cluster_class = ".cluster" + version_list.indexOf(version);
  var node_class = ".node" + version_list.indexOf(version);
  var list_id = "#ver" + version.toString().replace(/\./g, '').replace(/\s/g, '');

  $(".node>circle").css("stroke", "none");
  $(".node>circle").css("opacity", "0.2");
  var svg = d3.select("#svg_history");
  var cur_node = svg.selectAll(node_class);

  cur_node.selectAll("circle")
    .style("opacity", function(d) {
      if (d.data.change == 4 || d.data.change == 5 || d.data.change == 6) {
        return "1";  
      }
      else {
        return "0.2";
      }
      
    })
    .style("stroke", function(d){
          if (d.data.change == 4 || d.data.change == 5 || d.data.change == 6) {
            return "white";
          }
          else {
            return "none";
          }
        });
  $(".add_remove").css("visibility", "visible")
}


function showDifference(){
  var svg = d3.select("#svg_history");
  $("#ver1").removeClass("active");
  $("#ver2").removeClass("active");
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
  };


function showLink() {
  var lines = svg.selectAll("line.node");
}

function getPosition(string, subString, index) {
  return string.split(subString, index).join(subString).length;
}

function getAllNodes(root) {
  var nodes = [];
  root.children.forEach(function(d) {
    if (d.children) {
      d.children.forEach(function(d){
        nodes.push(d);
      });
    }
  });
  return nodes;
}

function findTargetNode(nodes, source){
  var element_pos = nodes.map(function(x) {return x.name}).indexOf(source.name);
  var target_node = nodes[element_pos]
  return target_node;

};

function getDifference(nodes, prev_nodes) {
  var moved = [];

  nodes.forEach(function(d) {
    if (d.data.change == 6) {
      moved.push({source: findTargetNode(prev_nodes, d), target: d});
    }
  });
  return moved;
};

function choose2Versions() {
  $("#choose_btn").css("display", "none");
  $("#compare_btn").attr("disabled", "disabled");
  $("#compare_btn").css("display", "block");
  $("#hist_btn").css("display", "none");

  $(".ver_list").addClass("option");
  $(".ver_list").removeClass("active");
  is_selecting = true;
}

function compare2Versions() {
    is_selecting = false;
    is_comparing = false;


  chosenArray = new Array();
  $("li[class*='chosen']").each(function(){
      // chosenArray.push($(this).attr("version").replace(/\./i, '').replace(/\s/g, ''));
      chosenArray.push($(this).attr("version"))
      console.log(chosenArray)
  });

  $(".option").css("display", "none");
  // $("#diff").css("display", "block");
  $("#back_btn").css("display", "none");
  $("#choose_btn").css("display", "block");
  $(".ver_list").css("display", "block");
  $("#diff").css("display", "none");
  $(".ver_list").removeClass("option");
  $(".ver_list").removeClass("chosen");
  $("#diff").addClass("chosen");
  $("#hist_btn").css("display", "block");
  $("#compare_btn").css("display", "none");
  console.log(chosenArray)

  window.location.href = location.href.split('single_layered.html')[0] + 'pairwise.html?&recovery=' + params.recovery +'&ver1=' + params.ver1 + '&ver2=' + params.ver2 + '&ver3=' + params.ver3 + '&chosen_1=' + chosenArray[0] + '&chosen_2=' + chosenArray[1] + '&software=' + params.software
    // return 'http://localhost:8888/EVA/Front-end/index_combined.html?&recovery=' + params.recovery +'&ver1=' + params.ver1 + '&ver2=' + params.ver2 + '&layer=' + $(this).attr("layer") + '&target_sub=' + $(this).attr("package")
  // loadGraph_comparison(chosenArray[0], chosenArray[1]);
  // $("#svg_comparison").css("display", "block");
  // $("#compare_btn").css("display", "none");
  // $("#back_btn").css("display", "block");

  // $("#diff").css("display", "block");

  // is_comparing = true;
  // var ver1_id = "#ver" + chosenArray[0].replace(/\./i, '').replace(/\s/g, '');
  // $(ver1_id).addClass("active");
}


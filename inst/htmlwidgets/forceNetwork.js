HTMLWidgets.widget({

  name: "forceNetwork",

  type: "output",

  initialize: function(el, width, height) {

    d3.select(el).append("svg")
        .attr("width", width)
        .attr("height", height);

    return d3.forceSimulation();
  },

  resize: function(el, width, height, force) {

    d3.select(el).select("svg")
        .attr("width", width)
        .attr("height", height);

    force.force("center", d3.forceCenter(width / 2, height / 2))
        .restart();
  },

  renderValue: function(el, x, force) {

  // Compute the node radius  using the javascript math expression specified
    function nodeSize(d) {
            if(options.nodesize){
                    return eval(options.radiusCalculation);

            } else {
                    return 6}

    }


    // alias options
    var options = x.options;

    // convert links and nodes data frames to d3 friendly format
    var links = HTMLWidgets.dataframeToD3(x.links);
    var nodes = HTMLWidgets.dataframeToD3(x.nodes);
    
    var all_links = links;
    var all_nodes = nodes;

    // create linkedByIndex to quickly search for node neighbors
    // adapted from: http://stackoverflow.com/a/8780277/4389763
    var linkedByIndex = {};
    links.forEach(function(d) {
      linkedByIndex[d.source + "," + d.target] = 1;
      linkedByIndex[d.target + "," + d.source] = 1;
    });
    function neighboring(a, b) {
      return linkedByIndex[a.index + "," + b.index];
    }

    // get the width and height
    var width = el.offsetWidth;
    var height = el.offsetHeight;

    var color = eval(options.colourScale);

    // set this up even if zoom = F
    var zoom = d3.zoom();

    // create d3 force layout
    force
      .nodes(d3.values(nodes))
      .force("link", d3.forceLink(links).distance(options.linkDistance))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("charge", d3.forceManyBody().strength(options.charge))
      .on("tick", tick);

    force.alpha(1).restart();

    var drag = d3.drag()
        .on("start", dragstart)
        .on("drag", dragged)
        .on("end", dragended)
      function dragstart(d) {
        if (!d3.event.active) force.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
      }
      function dragended(d) {
        if (!d3.event.active) force.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

    // select the svg element and remove existing children
    var svg = d3.select(el).select("svg");
    svg.selectAll("*").remove();
    // add two g layers; the first will be zoom target if zoom = T
    //  fine to have two g layers even if zoom = F
    svg = svg
        .append("g").attr("class","zoom-layer")
        .append("g")

    // add zooming if requested
    if (options.zoom) {
      function redraw() {
        d3.select(el).select(".zoom-layer")
          .attr("transform", d3.event.transform);
      }
      zoom.on("zoom", redraw)

      d3.select(el).select("svg")
        .attr("pointer-events", "all")
        .call(zoom);

    } else {
      zoom.on("zoom", null);
    }

    // draw links
    var link = svg.selectAll(".link")
      .data(links)
      .enter().append("line")
      .attr("class", "link")
      .style("stroke", function(d) { return d.colour ; })
      //.style("stroke", options.linkColour)
      .style("opacity", options.opacity)
      .style("stroke-width", eval("(" + options.linkWidth + ")"))
      .on("mouseover", function(d) {
          d3.select(this)
            .style("opacity", 1);
      })
      .on("mouseout", function(d) {
          d3.select(this)
            .style("opacity", options.opacity);
      });

    if (options.arrows) {
      link.style("marker-end",  function(d) { return "url(#arrow-" + d.colour + ")"; });

      var linkColoursArr = d3.nest().key(function(d) { return d.colour; }).entries(links);

      svg.append("defs").selectAll("marker")
          .data(linkColoursArr)
          .enter().append("marker")
            .attr("id", function(d) { return "arrow-" + d.key; })
            .attr("viewBox", "0, -5, 10, 10")
            .attr("refX", 0)
            .attr("markerWidth", 4)
            .attr("markerHeight", 4)
            .attr("orient", "auto")
            .style("fill", "context-fill")
            .style("fill", function(d) { return d.key; })
            .style("opacity", options.opacity)
          .append("path")
            .attr("d", "M0,-5 L10,0 L0,5");
    }

    // draw nodes
    var node = svg.selectAll(".node")
      .data(force.nodes())
      .enter().append("g")
      .attr("class", "node")
      .style("fill", function(d) { return color(d.group); })
      .style("opacity", options.opacity)
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)
      .on("click", click)
      .call(drag);

    node.append("circle")
      .attr("r", function(d){return nodeSize(d);})
      .style("stroke", "#fff")
      .style("opacity", options.opacity)
      .style("stroke-width", "1.5px");

    node.append("svg:text")
      .attr("class", "nodetext")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(function(d) { return d.name })
      .style("font", options.fontSize + "px " + options.fontFamily)
      .style("opacity", options.opacityNoHover)
      .style("pointer-events", "none");

    function tick() {
      node.attr("transform", function(d) {
        if(options.bounded){ // adds bounding box
            d.x = Math.max(nodeSize(d), Math.min(width - nodeSize(d), d.x));
            d.y = Math.max(nodeSize(d), Math.min(height - nodeSize(d), d.y));
        }

        return "translate(" + d.x + "," + d.y + ")"});

      function idx(d, type) {
        var linkWidthFunc = eval("(" + options.linkWidth + ")");
			  var a = d.target.x - d.source.x;
			  var b = d.target.y - d.source.y;
			  var c = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
  			if (type == "x1") return (d.source.x + ((nodeSize(d.source) * a) / c));
  			if (type == "y1") return (d.source.y + ((nodeSize(d.source) * b) / c));
  			if (options.arrows) {
  			  if (type == "x2") return (d.target.x - ((((5 * linkWidthFunc(d)) + nodeSize(d.target)) * a) / c));
  			  if (type == "y2") return (d.target.y - ((((5 * linkWidthFunc(d)) + nodeSize(d.target)) * b) / c));
  			} else {
  			  if (type == "x2") return (d.target.x - ((nodeSize(d.target) * a) / c));
  			  if (type == "y2") return (d.target.y - ((nodeSize(d.target) * b) / c));
  			}
		  }

      link
        .attr("x1", function(d) { return idx(d, "x1"); })
        .attr("y1", function(d) { return idx(d, "y1"); })
        .attr("x2", function(d) { return idx(d, "x2"); })
        .attr("y2", function(d) { return idx(d, "y2"); });
    }

    function mouseover(d) {
      // unfocus non-connected links and nodes
      //if (options.focusOnHover) {
        var unfocusDivisor = 4;

        link.transition().duration(200)
          .style("opacity", function(l) { return d != l.source && d != l.target ? +options.opacity / unfocusDivisor : +options.opacity });

        node.transition().duration(200)
          .style("opacity", function(o) { return d.index == o.index || neighboring(d, o) ? +options.opacity : +options.opacity / unfocusDivisor; });
      //}

      d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", function(d){return nodeSize(d)+5;});
      d3.select(this).select("text").transition()
        .duration(750)
        .attr("x", 13)
        .style("stroke-width", ".5px")
        .style("font", options.clickTextSize + "px ")
        .style("opacity", 1);
    }

    function mouseout() {
      node.style("opacity", +options.opacity);
      link.style("opacity", +options.opacity);

      d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", function(d){return nodeSize(d);});
      d3.select(this).select("text").transition()
        .duration(1250)
        .attr("x", 0)
        .style("font", options.fontSize + "px ")
        .style("opacity", options.opacityNoHover);
    }

    function click(d) {
      return eval(options.clickAction);
    }

    // add legend option
    
    if(options.legend){
        var legendRectSize = 18;
        var legendSpacing = 4;
        
        // clickable legend
        //var active_link = "0"; //to control legend selections and hover
        var legendEnabled = []; //to control legend selections
        //var legendClassArray = []; //store legend classes
        
        var y_orig; //to store original y-posn  
        
        
        var legend = d3.select(el).select('svg').selectAll('.legend')
          .data(color.domain())
          .enter()
          .append('g')
          .attr("class", function (d) {
            legendEnabled.push(d.replace(/\s/g, '')); //remove spaces
            return "legend";
          })
          .attr('transform', function(d, i) {
            var height = legendRectSize + legendSpacing;
            var offset =  height * color.domain().length / 2;
            var horz = legendRectSize;
            var vert = i * height+4;
            return 'translate(' + horz + ',' + vert + ')';
          });
          
          
        

        legend.append('circle')
          .attr('r', legendRectSize/3)
          //.attr('height', legendRectSize)
          .attr('cy', legendRectSize/2)
          .style('fill', color)
          .style('stroke', color)
          .style('stroke-width', legendRectSize/6)
          .attr("id", function (d, i) {
            return "id" + d.replace(/\s/g, '');
          })
          .on("click",clickLegend);

        legend.append('text')
          .style('fill', color)
          .attr('x', legendRectSize + legendSpacing)
          .attr('y', legendRectSize - legendSpacing)
          .text(function(d) { return d; });
    }

    // make font-family consistent across all elements
    d3.select(el).selectAll('text').style('font-family', options.fontFamily);
    
    function clickLegend(d){
      if(legendEnabled.includes(d.replace(/\s/g, ''))){
        d3.select(this)           
          .style("fill-opacity", 0.15);

        // remove all nodes of this group
        
    
        nodes = nodes.filter(function(n){return n.group != d});
        links = links.filter(function(l){
          return l.source.group != d && l.target.group != d;
        });
        legendEnabled.splice(legendEnabled.indexOf(d.replace(/\s/g, '')), 1);
      } else {
          d3.select(this)
            .style("fill-opacity",1);
            
            all_nodes.forEach(function(n){if(n.group == d){nodes.push(n)}});
            all_links.forEach(function(l){if(l.source.group == d || l.target.group == d){links.push(l)}});
            
          legendEnabled.push(d);
      }
            
            
        

        update();
        

          
    }
    
    function update() {
      node = node.data(nodes, function(n){ 
          return(n.name);
      });
      
      
      node.exit().remove();
    
      node = node.enter()
      .append("g").attr("class", "node")
      .style("fill", function(d) { return color(d.group); })
      .style("opacity", options.opacity)
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)
      .on("click", click).append("circle")
      .style("stroke", "#fff")
      .style("opacity", options.opacity)
      .style("stroke-width", "1.5px")
      .attr("r", 0)
      .call(function(node) { 
          node.transition().duration(500).attr("r", function(d){return nodeSize(d);})})
      .merge(node);
      
      node
      .call(drag)
      .append("svg:text")
      .attr("class", "nodetext")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text(function(d) { return d.name })
      .style("font", options.fontSize + "px " + options.fontFamily)
      .style("opacity", options.opacityNoHover)
      .style("pointer-events", "none");
      
      
      
          
      
      link = link.data(links, 
      function(l){
          return l.source.name + "-" + l.target.name;
      });
      
      link.exit().remove();
       
      link = link.enter().append("line")
      .attr("class", "link")
      .style("stroke", function(d) { return d.colour ; })
      //.style("stroke", options.linkColour)
      .style("opacity", 0)
      .call(function(link) { 
          link.transition().duration(500).style("opacity", options.opacity)})
      .merge(link);
      
     
      
      
      force
      .nodes(nodes)
      .force("link").links(links);
      
    /*  force.force("center", d3.forceCenter(width / 2, height / 2))
      .force("charge", d3.forceManyBody().strength(options.charge))
      .on("tick", tick);
*/
     
    force.alpha(1).restart();
    }
  },
});

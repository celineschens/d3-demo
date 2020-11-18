
//wrap everything in a self-executing anonymous function to move to local scope
(function(){

  //global variables
  var keyArray = ["2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018"];
  var expressed = keyArray[0];

  //chart frame dimensions
  var chartWidth = window.innerWidth * 0.5,
    chartHeight = 440,
    leftPadding = 37,
    rightPadding = 2,
    topBottomPadding = 5,
    chartInnerWidth = chartWidth - leftPadding - rightPadding,
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

  //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
      .range([chartHeight,0])
      .domain([0,4000])
      .nice();

    var xScale = d3.scaleBand()
      .range([0,chartWidth])
      .padding(0.1);

  window.onload = setMap(); //start script once HTML is loaded

  function setMap(){
    
    //map frame dimensions
    var width = window.innerWidth * .4
    ,
    height = 550;

    //create new svg container for the map
    var map = d3.select("#divMap")
      .append("svg")
      .attr("class", "map")
      .attr("width", width)
      .attr("height", height)
      .append("g");

    var pan = d3.select("#divMap")
      .append("text")
      .attr("class", "pan")
      .text("Pan and zoom with cursor and mouse wheel.");

    //create Albers equal area conic projection centered on the USA
    var projection = d3.geoAlbers()
      .center([1, 39])
      .rotate([120, 0])
      .parallels([34, 40.5])
      .scale(2600)
      .translate([width / 2, height / 2]);
      
    var path = d3.geoPath()
      .projection(projection);

    var zoom = d3.zoom()
      .scaleExtent([1,8])
      .on('zoom', zoomed);
    
    var g = map.append("g");

    map.call(zoom);

    function zoomed() {
      g.selectAll('path') // To prevent stroke width from scaling
      .attr('transform', d3.event.transform);
    }

    queue()
      //.defer(d3.csv, "data/unitsData.csv")
      .defer(d3.csv, "data/CAgas.csv")
      //.defer(d3.json, "data/counties-albers-10m.json")
      .defer(d3.json, "data/cacounty.json") //load geometry from CA counties topojson
      .await(callback);

    function callback(error, csvData, county){
      
    //place graticule on the map
    setGraticule(g, path);

/*     //variables for csv to json data transfer
    var jsonCounties = county.objects.cacounties.geometries;
    console.log(jsonCounties); */
	
      // var USAstates = topojson.feature(states, states.objects.states),
      //translate county topoJSON
      var CAcounties = topojson.feature(county, county.objects.cacounty).features;

      console.log(CAcounties);      

      CAcounties = joinData(CAcounties, csvData)
      console.log(CAcounties);      

      var colorScale = makeColorScale(csvData);
      setEnumerationUnits(CAcounties, g, path, colorScale, csvData);

      //add coordinated visualization to the map
      setChart(csvData, colorScale);

      createDropdown(csvData);

    };

  }; //end setMap

  function setGraticule(g, path){
    var graticule = d3.geoGraticule()
      .step([5,5]); //place graticule lines every 5 degrees of longitude and latitude
    //create graticule background
    var gratBackground = g.append("path")
      .datum(graticule.outline) //bind graticule background
      .attr("class", "gratBackground") //assign class for styling
      .attr("d", path) //project graticule
     
    //create graticule lines	
    var gratLines = g.selectAll(".gratLines") //select graticule elements that will be created
      .data(graticule.lines) //bind graticule lines to each element to be created
      .enter() //create an element for each datum
      .append("path") //append each element to the svg as a path element
      .attr("class", "gratLines") //assign class for styling
      .attr("d", path); //project graticule lines
  };

  //function to create coordinated bar chart
  function setChart(csvData, colorScale){

    //create a second svg element to hold the bar chart
    var chart = d3.select("#divChart")
      .append("svg")
      .attr("width", chartWidth)
      .attr("height", chartHeight)
      .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
      .attr("class", "chartBackground")
      .attr("width", chartInnerWidth)
      .attr("height", chartInnerHeight)
      .attr("transform", translate);


    //set bars for each province
    var bars = chart.selectAll(".bar")
      .data(csvData)
      .enter()
      .append("rect")
      //sort bars largest to smallest
      .sort(function(a, b){
          return b[expressed]-a[expressed]
      })
      .attr("class", function(d){
          return "bar " + d.JoinKey;
      })
      .attr("width", (chartInnerWidth / csvData.length - 1))
      .on("mouseover", highlight)
      .on("mouseout", dehighlight)
      .on("mousemove", moveLabel);

    //add style descriptor to each rect
    var desc = bars.append("desc")
      .text('{"stroke": "none", "stroke-width": "0px"}');
   /*  //annotate bars with attribute value text
    var numbers = chart.selectAll(".numbers")
    .data(csvData)
    .enter()
    .append("text")
    .sort(function(a, b){
        return a[expressed]-b[expressed]
    })
    .attr("class", function(d){
        return "numbers " + d.adm1_code;
    })
    .attr("text-anchor", "middle")
    .attr("x", function(d, i){
        var fraction = chartWidth / csvData.length;
        return i * fraction + (fraction - 1) / 2;
    })
    .attr("y", function(d){
        return chartHeight - yScale(parseFloat(d[expressed])) + 15;
    })
    .text(function(d){
        return d[expressed];
    }); */

  var chartTitle = chart.append("text")
    .attr("x", 100)
    .attr("y", 30)
    .attr("class", "chartTitle")
    .text(expressed + "CA Retail Gasoline Sales " + " in each county");
  
    //console.log(expressed);
  //create vertical axis generator
  var yAxis = d3.axisLeft()
    .scale(yScale);

  var xAxis = d3.axisBottom()
    .scale(xScale);

  
  //place axis
  var y_axis = chart.append("g")
    .attr("class", "yaxis")
    .attr("transform", translate)
    .call(yAxis);

  var x_axis = chart.append("g")
    .attr("class", "xaxis")
    .attr("transform", translate)
    .call(yAxis);
    
  //create frame for chart border
  var chartFrame = chart.append("rect")
    .attr("class", "chartFrame")
    .attr("width", chartInnerWidth)
    .attr("height", chartInnerHeight)
    .attr("transform", translate);
  
  //set bar positions, heights, and colors
  updateChart(bars, csvData.length, colorScale, csvData, chart);
  };
  

 

  function joinData(CAcounties, csvData) {
    //loop through csv data to assign each csv region's values to json region properties
    for (var i=0; i<csvData.length; i++) {		
      var csvRegion = csvData[i]; //the current region's attributes
      var csvAdm1 = csvRegion.NAME; //adm1 code
      
      //console.log(csvRegion.JoinKey);

      //loop through json regions to assign csv data to the right region
      for (var a=0; a<CAcounties.length; a++){
        
        //where adm1 codes match, attach csv data to json object
        if (CAcounties[a].properties.NAME == csvAdm1){
          
          //one more for loop to assign all key/value pairs to json object
          for (var key in keyArray){
            var attr = keyArray[key];
            var val = parseFloat(csvRegion[attr]);
            CAcounties[a].properties[attr] = val;
          };
          
          CAcounties[a].properties.name = csvRegion.name; //set prop
          
          //console.log(CAcounties);
          break; //stop looking through the json regions
          
        };
      };
    };

    return CAcounties;
  };

  function setEnumerationUnits(CAcounties, map, path, colorScale){

    var counties = map.selectAll(".JoinKey")
      .data(CAcounties)
      .enter()
      .append("path")
      .attr("class", function(d){
        //console.log(d.properties.NAME);
        return "counties " + d.properties.JoinKey;
      })
      .attr("d", path)
      .style("fill", function(d){
        return choropleth(d.properties, colorScale);
      })
      .on("mouseover", function(d){
        highlight(d.properties);
      })
      .on("mouseout", function(d){
          dehighlight(d.properties);
      })
      .on("mousemove", moveLabel);

    var desc = counties.append("desc")
      .text('{"stroke": "#fcfffa", "stroke-width": "0.5px"}');
  };

  function makeColorScale(CSVdata){
    var colorClasses = [
      "#9dc6e0",
      "#7aa6c2",
      "#5886a5",
      "#346888",
      "#004c6d",
		];

    //create color scale generator
    var colorScale = d3.scaleThreshold()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<CSVdata.length; i++){
        var val = parseFloat(CSVdata[i][expressed]);
        domainArray.push(val);
    };

    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function(d){
        return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();

    //assign array of last 4 cluster minimums as domain
    colorScale.domain(domainArray);

    return colorScale;
};


  function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#c1e7ff";
    };
  };

  //function to create a dropdown menu for attribute selection
  function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("#divDropdown")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
          changeAttribute(this.value, csvData)
        });

    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Attribute");

    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(keyArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
  };

  //dropdown change listener handler
  function changeAttribute(attribute, csvData, props){
    //change the expressed attribute
    expressed = attribute;

    console.log(csvData);
    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var counties = d3.selectAll(".JoinKey")
      .transition()
      .duration(1000)
      .style("fill", function(d){
          return choropleth(d.properties, colorScale)
      });
      
    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
      //re-sort bars
      .sort(function(a, b){
          return b[expressed] - a[expressed];
      })
      .transition() //add animation
      .delay(function(d, i){
          return i * 20
      })
      .duration(500);

    updateChart(bars, csvData.length, colorScale, csvData);
  }; //end of changeAttribute()

  //function to position, size, and color bars in chart
  function updateChart(bars, n, colorScale, csvData, chart){
    //position bars
    bars.attr("x", function (d, i) {
          return i * (chartInnerWidth / n) + leftPadding;
      })
      //size/resize bars
      .attr("height", function (d, i) {
          //console.log(parseFloat(d[expressed]));
          return 430 - yScale(parseFloat(d[expressed]));
      })
      .attr("y", function (d, i) {
          return yScale(parseFloat(d[expressed])) + topBottomPadding;
      })
      //color/recolor bars
      .style("fill", function (d) {
          return choropleth(d, colorScale);
      });
    //at the bottom of updateChart()...add text to chart title
    var chartTitle = d3.select(".chartTitle")
      .text(expressed + " CA Retail Gasoline Sales " + " By County");
    console.log(expressed);

    buildLegend(csvData);
  };

  function highlight(props) {
    var selected = d3.selectAll("." + props.JoinKey)	
      .style("stroke", "blue")
      .style("opacity", .5)			
      .style("stroke-width","2");		

    setLabel(props);
  };


    //* Function to reset the element style on mouseout	
  function dehighlight(props) {
    var selected = d3.selectAll("." + props.JoinKey)
      .style("stroke", function() {
        return getStyle(this,"stroke")	
      })
      .style("stroke-width", function() {
        return getStyle(this,"stroke-width")
      })
    
      .style("opacity", function(){			
        return getStyle(this,"opacity")
      });	
    
    // Remove info label		
    d3.select(".infolabel")
      .remove();
    
    
    function getStyle(element, styleName) {		
      var styleText = d3.select(element)
        .select("desc")
        .text();	// return the text content
      
      var styleObject = JSON.parse(styleText);
        return styleObject[styleName];	// return the text content
      
    };
  }; //* end dehighlight()


  function setLabel(props) {
    //Create an HTML string with <h1> element that contains the selected dropdown attribute
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + "million gallons in " + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.JoinKey + "_label")
        .html(labelAttribute);

    var countyName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.NAME);
};

  // Function to move infolabel with mouse
  function moveLabel() {
    // Get Width of label
    var labelWidth = d3.select(".infolabel")
      .node()
      .getBoundingClientRect()
      .width;
    
    //* User coordinates of mousemove to set label coordinates
    //* d3.event.clientX/Y = position of mouse
    var x1 = d3.event.clientX + 10,
      y1 = d3.event.clientY - 75,
      x2 = d3.event.clientX - labelWidth - 10,
      y2 = d3.event.clientY + 25;
    
    //* Horizontal label coordinates
    //* Test for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    
    //* Vertical label coordinate
    //* Test for overflow
    var y = d3.event.clientY < 75 ? y2 : y1;
    
    d3.select(".infolabel")
      .style("left", x + "px")
      .style("top", y + "px");
  };

  function buildLegend(csvData) {
    var colorScale = makeColorScale(csvData);
    var width = 200;
    $(".legend").remove();
    var svg = d3.select("#divLegend")
      .append("svg")
      .attr("width", width)
      .attr("height", 100)
      .attr("class", "legend");
      
    var legend = svg.selectAll('g.legendEntry')
      .data(colorScale.range().reverse())
      .enter()
      .append('g').attr('class', 'legendEntry');
    
     legend.append('rect')
      .attr("x",20)
      .attr("y", function(d, i) {
          return i * 20;
      })
      .attr("width", 20)
      .attr("height", 20)
      .style("stroke", "black")
      .style("stroke-width", 0.5)
      .style("fill", function(d){
        return d;
      });
  
    legend.append('text')
      .attr("x", 70) //leave 5 pixel space after the <rect>
      .attr("y", function(d, i) {
          return i * 20;
      })
      .attr("dy", "1.2em") //move text from the x,y point
      .text(function(d,i) {
          var extent = colorScale.invertExtent(d);
          //extent will be a two-element array, format it however you want:
          var format = d3.format(",");
          return format(+extent[0]) + " - " + format(+extent[1]);
      });
  };

})(); //last line of main.js - self-executing anonymous function
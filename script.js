// here i use async function to load data just like cat did in the demo
async function loadData() {
    //this is where I load in my csv data
    let data = await d3.csv("bugindex.csv");

    data = data.map(d => {
    const clean = {};
      Object.keys(d).forEach(k => clean[k.trim()] = d[k]);
    return clean;
        });

    //this is just cleaning up some of the gaps in my csv code so it can run 
    data.forEach(d => {
          const bugRatingStr = d["BUG RATING OUT OF 5"] || d["BUG RATING OUT OF 5 "] || "0";
           const totalBugsStr = d["TOTAL OF BUGS THAT EAT"] || "0";
            const coordStr = d["COORDINATES"] || "";

    d.plantName = (d["PLANT NAME"] || "").trim();
    d.isabellaBugRanking = Number(bugRatingStr.trim());
    d.totalBugsThatEat = Number(totalBugsStr.trim());

           const parts = coordStr.split(",");
            d.lat = parts.length === 2 ? Number(parts[0].trim()) : 0;
             d.lon = parts.length === 2 ? Number(parts[1].trim()) : 0;

           d.circleRadius = 25 + d.totalBugsThatEat * 10;
    });


    //this is my adobe images i imported and im telling the system to map them to how i like
    drawMap(data);
}

//calls the async function
loadData();

     function drawMap(data) {
       const width = window.innerWidth;
        const height = window.innerHeight;

     d3.select("body")
       .append("img")
      .attr("src", "title.png")
      .attr("id", "titleImage")
       .style("position", "fixed")
      .style("top", "-150px")
      . style("left", "20px")
      .style("width", "450px")
      .style("height", "auto")
       .style("z-index", 1000);

  d3.select("body")
       .append("img")
       .attr("src", "directions.png")
      .attr("id", "directionsImage")
      .style("position", "fixed")
      .style("top", "50px")
       .style("left", "20px")
      .style("width", "450px")
        .style("height", "auto")
       .style("z-index", 999);

   
        const topDisplay = d3.select("body")
        .append("div")
          .attr("id", "topDisplay")
        .style("position", "fixed")
          .style("top", "20px")
        .style("left", "56%")
        .style("transform", "translateX(-50%)")
         .style("font-family", "sans-serif")
        .style("text-align", "center")
        .style("color", "#222");



      const nameDisplay = topDisplay.append("div")
        .attr("id", "plantNameDisplay")
         .style("font-size", "40px")
        .style("font-weight", "bold")
         .style("margin-bottom", "6px")
         .text("");

      const bugRatingDisplay = topDisplay.append("div")
         .attr("id", "bugRatingDisplay")
        .style("font-size", "24px")
         .style("margin-bottom", "4px")
        .text("");

      const totalBugsDisplay = topDisplay.append("div")
        .attr("id", "totalBugsDisplay")
         .style("font-size", "24px")
        .text("");
 
    
       d3.select("body")
      .append("img")
      .attr("src", "compass.jpg")
      .attr("id", "topRightCompass")
       .style("position", "fixed")
      .style("top", "20px")
       .style("right", "300px")
       .style("width", "100px")
      . style("height", "auto")
      .style("z-index", 1000);

     //this is the entire graph
     const svg = d3.select("body")
        .append("svg")
         .attr("width", width)
        .attr("height", height)
        .style("position", "relative")
         .style("top", "50px")
        .style("left", "55%")        
         .style("transform", "translateX(-50%)");

     const projection = d3.geoMercator()
         .center([-97.7325, 30.2861])
         .scale(width * 25000)
        .translate([width / 2, height / 2]);
 
     const nodes = data.map(d => {
        const coords = projection([d.lon, d.lat]);
        return { ...d, x: coords[0], y: coords[1] };
    });

    //okay this is literally the entire circle interactions so making them grow + not overlap + connecting them
     const circleSimulation = d3.forceSimulation(nodes)
         .force("x", d3.forceX(d => d.x).strength(0.5))
         .force("y", d3.forceY(d => d.y).strength(0.5))
         .force("collide", d3.forceCollide(d => d.circleRadius + 5))
         .stop();
     for (let i = 0; i < 300; i++) circleSimulation.tick();

     const orderedNames = [
        "Dead Leaf",
        "Morning Glory",
        "Hedge Parsley",
        "Oak Sapling",
        "Milkweed",
        "Magnolia Tree Leaf",
        "Mustang Grape",
        "Polemonium Reptans",
        "Raintree Leaf",
        "Invasive Privet"
    ];
    function perimeterPoint(from, to) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        return [
            from.x + Math.cos(angle) * from.circleRadius,
            from.y + Math.sin(angle) * from.circleRadius
        ];
    }
    let outerPoints = [];
    for (let i = 0; i < orderedNames.length; i++) {
        const from = nodes.find(n => n.plantName === orderedNames[i]);
        const to = nodes.find(n => n.plantName === orderedNames[i + 1]);

        if (!from) continue;

        if (to) {
            outerPoints.push(perimeterPoint(from, to));
        } else {
            outerPoints.push([from.x + from.circleRadius, from.y]);
        }
    }

    //more circle data - this is part of how they look visually structure wise 
    const curvedLine = d3.line()
         .curve(d3.curveCatmullRom.alpha(0.85))
         .x(d => d[0])
        .y(d => d[1]);

    svg.append("path")
         .attr("d", curvedLine(outerPoints))
        .attr("fill", "none")
        .attr("stroke", "#444")
         .attr("stroke-width", 4)
         .attr("stroke-dasharray", "12 10")
        .attr("stroke-linecap", "round")
         .attr("stroke-linejoin", "round")
        .attr("opacity", 0.9);

    //how the circles grww based off the total bug eat data from the csv 
     const maxBugs = d3.max(nodes.map(d => d.totalBugsThatEat));

     const growScale = d3.scalePow()
        .exponent(2)
         .domain([0, maxBugs])
         .range([1, 2.5]);

       //this is the color class of the circles and how the color alignes wih the bug ranking
       const ratings = nodes.map(d => d.isabellaBugRanking);
        const sortedRatings = [...new Set(ratings)].sort((a, b) => b - a);
      const gold = sortedRatings[0];
      const silver = sortedRatings[1] || gold;
        const bronze = sortedRatings[2] || silver;

       function getColor(rating) {
         if (rating === 5) return "#add8e6";       
         if (rating === gold) return "#2e8b57";    
         if (rating === silver) return "#d2b48c";  
         if (rating === bronze) return "#FFFFB3";  
         return "#228b22";                         
    }
    //this is the mouse interactions with the circles + knowing when to grow + shrink + display infor on the top
    svg.selectAll("circle")
         .data(nodes)
         .enter()
         .append("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
         .attr("r", d => d.circleRadius)
        .attr("fill", d => getColor(d.isabellaBugRanking))
         .attr("stroke", "black")
         .attr("opacity", 0.85)
         .on("mouseover", function(event, d) {
            const growFactor = growScale(d.totalBugsThatEat);
            d3.select(this)
                .raise()
                .transition()
                .duration(600)
                .ease(d3.easeBackOut)
                .attr("r", d.circleRadius * growFactor);
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .transition()
                 .duration(600)
                .ease(d3.easeBackIn)
                .attr("r", d.circleRadius);
        })
        //this is what controls the text on the top of the screen when i click on a circle. Its saying hey when you click make this appear
        .on("click", function(event, d) {
             nameDisplay.text(d.plantName);
             bugRatingDisplay.text("Bug Rating: " + d.isabellaBugRanking + "/5");
             totalBugsDisplay.text("Total Bugs That Eat: " + d.totalBugsThatEat);
        });
   //this is the text inside of the circle 
    svg.selectAll(".circleText")
         .data(nodes)
        .enter()
        .append("text")
        .attr("class", "circleText")
        .attr("x", d => d.x)
         .attr("y", d => d.y + 5)
         .attr("text-anchor", "middle")
        .attr("font-size", "16px")
        .attr("font-weight", "bold")
        .attr("fill", "black")
        .text(d => d.isabellaBugRanking);

    window.addEventListener("resize", () => {
        svg.attr("width", window.innerWidth)
           .attr("height", window.innerHeight);
    });
}

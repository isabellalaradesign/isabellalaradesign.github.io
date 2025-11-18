// Async function to load CSV data
async function loadData() {
    let data = await d3.csv("bugindex.csv");
    data = data.map(d => {
         const clean = {};
        Object.keys(d).forEach(k => clean[k.trim()] = d[k]);
        return clean;
    });
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
    drawMap(data);
}

loadData();
function drawMap(data) {
    const width = window.innerWidth;
    const height = window.innerHeight;

//this is my title image 
    d3.select("body")
        .append("img")
        .attr("src", "title.png")
        .attr("id", "titleImage")
        .style("position", "fixed")
        .style("top", "-150px")
        .style("left", "20px")
        .style("width", "450px")
        .style("height", "auto")
        .style("z-index", 1000);

    // this is the directions 
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

    topDisplay.append("div")
        .attr("id", "plantNameDisplay")
        .style("font-size", "40px")
        .style("font-weight", "bold")
        .style("margin-bottom", "6px")
        .text("");

    topDisplay.append("div")
        .attr("id", "bugRatingDisplay")
        .style("font-size", "24px")
        .style("margin-bottom", "4px")
        .text("");

    topDisplay.append("div")
        .attr("id", "totalBugsDisplay")
        .style("font-size", "24px")
        .text("");

    // lil compass on top right 
    d3.select("body")
        .append("img")
        .attr("src", "compass.jpg")
        .attr("id", "topRightCompass")
        .style("position", "fixed")
        .style("top", "20px")
        .style("right", "300px")
        .style("width", "100px")
        .style("height", "auto")
        .style("z-index", 1000);

    // here is where i used D3 to map the cirles coordinates 
    const projection = d3.geoMercator()
         .center([-97.7325, 30.2861])
          .scale(width * 25000)
           .translate([width / 2, height / 2]);

       const nodes = data.map(d => {
          const coords = projection([d.lon, d.lat]);
         return { ...d, x: coords[0], y: coords[1] };
    });

    // D3 is forcing the circles to stay in place but to not overlap 
    const circleSimulation = d3.forceSimulation(nodes)
          .force("x", d3.forceX(d => d.x).strength(0.5))
         .force("y", d3.forceY (d => d.y).strength(0.5))
         .force("collide", d3.forceCollide (d => d.circleRadius + 5))
         .stop();

    for (let i = 0; i < 300; i++) circleSimulation.tick();
    const maxBugs = d3.max(nodes.map(d => d.totalBugsThatEat));
    const growScale = d3.scalePow()
        .exponent(2)
        .domain([0, maxBugs])
        .range([1, 2.5]);

    const ratings = nodes.map(d => d.isabellaBugRanking);
    const sortedRatings = [...new Set(ratings)].sort((a, b) => b - a);
    const gold = sortedRatings[0];
    const silver = sortedRatings[1] || gold;
    const bronze = sortedRatings[2] || silver;

//circle color !!!!
    function getColor(rating) {
        if (rating === 5) return "#add8e6";
        if (rating === gold) return "#2e8b57";
        if (rating === silver) return "#d2b48c";
        if (rating === bronze) return "#FFFFB3";
        return "#228b22";
    }
//goodbye SVG hello DIV - reworked but i will say SVG format gives a much cleaner look 
    const container = d3.select("body")
        .append("div")
        .attr("id", "circleContainer")
        .style("position", "absolute")
        .style("top", "50px")
        .style("left", "0px")
        .style("width", width + "px")
        .style("height", height + "px")
        .style("pointer-events", "none");

    // here are my nodes which represent a plant with coordinates, size, and rating.
    container.selectAll(".circleDiv") 
        .data(nodes)
        .enter()
        .append("div")
        .attr("class", "circleDiv")
        .style("position", "absolute")
        .style("left", d => (d.x - d.circleRadius) + "px")
        .style("top", d => (d.y - d.circleRadius) + "px")
        .style("width", d => (d.circleRadius * 2) + "px")
        .style("height", d => (d.circleRadius * 2) + "px")
        .style("border-radius", "50%")
        .style("background-color", d => getColor(d.isabellaBugRanking))
        .style("border", "2px solid black")
        .style("opacity", "0.85")
        .style("display", "flex")
        .style("align-items", "center")
        .style("justify-content", "center")
        .style("font-size", "18px")
        .style("font-weight", "bold")
        .style("color", "black")
        .style("pointer-events", "auto") 
        .text(d => d.isabellaBugRanking)
        .on("mouseover", function(event, d) {
            const growFactor = growScale(d.totalBugsThatEat);
            d3.select(this)
                .raise()
                .transition()
                .duration(600)
                .ease(d3.easeBackOut)
                .style("transform", `scale(${growFactor})`)
                .style("z-index", 9999);
        })
        //lets circles shrink from the mouse hover above 
        .on("mouseout", function(event, d) {
            d3.select(this)
                 .transition()
                .duration(600)
                .ease(d3.easeBackIn)
                .style("transform", "scale(1)")
                .style("z-index", 1);
        });

    window.addEventListener("resize", () => {
        container.style("width", window.innerWidth + "px")
                 .style("height", window.innerHeight + "px");
    });
}

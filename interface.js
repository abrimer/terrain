/**
 * @module interface.js
 *
 * this program creates control widgets and displays for
 * them to update, and invokes the terrain generator to
 * draw the maps.
 *
 * The original was created by Martin O'Leary to demonstrate
 * the steps of his terrain generation process, and
 * subsequently documented by Mark Kampe.
 */

// RANDOM SEED sets all randomness
 var newRand = new MersenneTwister(randomSeed);
 var simplex2 = new SimplexNoise(randomSeed);
 /**
  * runif: random number within a range
  *
  * @param lo	low end of range
  * @param hi	high end of range
  * @return	number between lo and hi
  */
 function runif(lo, hi) {
     return lo + newRand.random() * (hi - lo);
 }

// var randomCount = 0;
// function runif(lo, hi) {
//   randomCount = randomCount + 100;
//   // console.log(simplex2.noise2D(randomCount,0))
//   return lo + simplex2.noise2D(randomCount,0) * (hi - lo);
//  }


/**
 * addSVG - add a Scalable Vector Graphics pannel to a div
 *
 * @param	division to which pannel should be added
 */
function addSVG(div, h, w) {
    h = h || 500
    w = w || 500
    jQuery('<div/>', {
      id: 'svg-container',
    }).appendTo("#main");

    return d3.select("div#svg-container").insert("svg")
        .attr("height", h)
        .attr("width", w)
        // .attr("viewBox", "-485 -485 970 970")
        .attr("viewBox", "-500 -500 1000 1000")

        .attr("class","svg")
        .attr("preserveAspectRatio","xMidYMid meet");
}

/**
 * main editing window
 */
var mainDiv = d3.select("div#main");

var mainRender = {
    params: defaultParams,
    // h: zero(generateGoodMesh(defaultParams.npts, defaultExtent)),
    cities: [],
    lang: makeRandomLanguage()
};

var mainViewSlope = true;
var mainViewHeight = true;
var mainViewErosion = false;
var mainViewScore = false;
var mainViewCoast = true;
var mainViewRivers = true;
var mainViewCities = true;
var mainViewBorders = true;
var mainViewLabels = true;

function mainDraw(mainSVG) {
    if (mainViewErosion) {
        visualizeVoronoi(mainSVG, erosionRate(mainRender.h));
    } else if (mainViewScore) {
        var score = cityScore(mainRender.h, mainRender.cities);
        visualizeVoronoi(mainSVG, score, d3.max(score) - 0.5);
    } else if (mainViewHeight) {
        visualizeVoronoi(mainSVG, mainRender.h, 0, 1);
    } else {
        mainSVG.selectAll("path.field").remove();
    }
    if (mainViewCoast) {
        drawPaths(mainSVG, "coast", contour(mainRender.h, 0));
    } else {
        drawPaths(mainSVG, "coast", []);
    }
    if (mainViewRivers) {
        drawPaths(mainSVG, "river", getRivers(mainRender.h, 0.003));
        // Limit sets threshold above which rivers are visualized
    } else {
        drawPaths(mainSVG, "river", []);
    }
    if (mainViewSlope) {
        visualizeSlopes(mainSVG, {h:mainRender.h});
    } else {
        visualizeSlopes(mainSVG, {h:zero(mainRender.h.mesh)});
    }
    if (mainViewCities) {
        placeCities(mainRender);
        visualizeCities(mainSVG, mainRender);
    }
    if (mainViewBorders) {
        mainRender.terr = getTerritories(mainRender);
        drawPaths(mainSVG, 'border', getBorders(mainRender));
    }
    if (mainViewLabels) {
        mainRender.rivers = getRivers(mainRender.h, 0.003);
        mainRender.coasts = contour(mainRender.h, 0);
        mainRender.terr = getTerritories(mainRender);
        mainRender.borders = getBorders(mainRender);
        // mainRender.h.style("fill", function(d) { return colorScale(d.value); });
        drawLabels(mainSVG, mainRender);
    } else {
        mainSVG.selectAll('text.region')
            .text(function (d) {return ""})
            .raise();
        mainSVG.selectAll('text.city')
            .text(function (d) {return ""})
            .raise();
    }


    // drawPaths(mainSVG, "bounds", mainRender.bounds); //Draw top and bottom bounds

    // $(document).ready(function() {
    //    $('#download').attr('href', 'data:application/octet-stream;base64,' + btoa($("#svg-container").html()));
    // });
}


// RIVER GENERATION
mainDiv.append("button")
    .text("GENERATE RIVER")
    .on("click", function () {
      mainRender.cities = [];
      mainRender.h = generateRiver(defaultParams);
      mainDraw(addSVG(mainDiv, 500*defaultExtent.height, 500*defaultExtent.width));
      randomSeed++;
      newRand = new MersenneTwister(randomSeed);
    });


// mainDiv.append("button")
//     .text("Reset to flat")
//     .on("click", function () {
//         mainRender.cities = [];
//         mainRender.h = zero(mainRender.h.mesh);
//         mainDraw();
//     });
// mainDiv.append("h3")
//     .text("Add")
// // create a flat map
// // choose a slope vector, and slope the entire map
// mainDiv.append("button")
//     .text("Add random slope")
//     .on("click", function () {
//         mainRender.h = add(mainRender.h, slope(mainRender.h.mesh, randomVector(4)));
//         mainDraw();
//     });
// // slope the map downwards out from the center
// mainDiv.append("button")
//     .text("Add cone")
//     .on("click", function () {
//         mainRender.h = add(mainRender.h, cone(mainRender.h.mesh, -0.5));
//         mainDraw();
//     });
// // slope the map upwards out from the center
// mainDiv.append("button")
//     .text("Add inverted cone")
//     .on("click", function () {
//         mainRender.h = add(mainRender.h, cone(mainRender.h.mesh, 0.5));
//         mainDraw();
//     });
// // add five randomly chosen mountains
// mainDiv.append("button")
//     .text("Add five blobs")
//     .on("click", function () {
//         mainRender.h = add(mainRender.h, mountains(mainRender.h.mesh, 5));
//         mainDraw();
//     });
// // add seven randomly chosen ridges
// mainDiv.append("button")
//     .text("Add seven ridges")
//     .on("click", function () {
//         mainRender.h = add(mainRender.h, ridges(mainRender.h.mesh, 7, 0.04, 15.0));
//         mainDraw();
//     });
// mainDiv.append("button")
//     .text("ADD CITIES")
//     .on("click", function () {
//         // placeCity(mainRender);
//         placeCities(mainRender);
//         mainDraw(mainSVG);
//     });
// mainDiv.append("h3")
//     .text("Shape")
// // normalize the height map to 0-1
// mainDiv.append("button")
//     .text("Normalize heightmap")
//     .on("click", function () {
//         mainRender.h = normalize(mainRender.h);
//         mainDraw();
//     });
// // exaggerate the vertical relief
// mainDiv.append("button")
//     .text("Round hills")
//     .on("click", function () {
//         mainRender.h = peaky(mainRender.h);
//         mainDraw();
//     });
// // smooth the terrain
// mainDiv.append("button")
//     .text("Relax")
//     .on("click", function () {
//         mainRender.h = relax(mainRender.h);
//         mainDraw();
//     });
// mainDiv.append("button")
//     .text("Erode")
//     .on("click", function () {
//         mainRender.h = doErosion(mainRender.h, 0.1);
//         mainDraw();
//     });
// // draw a sea-level line
// mainDiv.append("button")
//     .text("Set sea level to median")
//     .on("click", function () {
//         mainRender.h = setSeaLevel(mainRender.h, 0.5);
//         mainDraw();
//     });
// mainDiv.append("button")
//     .text("Clean coastlines")
//     .on("click", function () {
//         mainRender.h = cleanCoast(mainRender.h, 1);
//         mainRender.h = fillSinks(mainRender.h);
//         mainDraw();
//     });
// mainDiv.append("h3")
//     .text("Presets")
// var mainCoastBut = mainDiv.append("button")
//     .text("Hide coastline")
//     .on("click", function () {
//         mainViewCoast = !mainViewCoast;
//         mainCoastBut.text(mainViewCoast ? "Hide coastline" : "Show coastline");
//         mainDraw();
//     });
// var mainRiverBut = mainDiv.append("button")
//     .text("Hide rivers")
//     .on("click", function () {
//         mainViewRivers = !mainViewRivers;
//         mainRiverBut.text(mainViewRivers ? "Hide rivers" : "Show rivers");
//         mainDraw();
//     });
// var mainSlopeBut = mainDiv.append("button")
//     .text("Hide slope shading")
//     .on("click", function () {
//         mainViewSlope = !mainViewSlope;
//         mainSlopeBut.text(mainViewSlope ? "Hide slope shading" : "Show slope shading");
//         mainDraw();
//     });
// var mainHeightBut = mainDiv.append("button")
//     .text("Show heightmap")
//     .on("click", function () {
//         mainViewHeight = !mainViewHeight;
//         mainHeightBut.text(mainViewHeight ? "Hide heightmap" : "Show heightmap");
//         mainDraw();
//     });
// var mainCityBut = mainDiv.append("button")
//     .text("Hide cities")
//     .on("click", function () {
//         mainViewCities = !mainViewCities;
//         mainCityBut.text(mainViewCities ? "Hide cities" : "Show cities");
//         mainDraw();
//     });
// var mainBorderBut = mainDiv.append("button")
//     .text("Hide borders")
//     .on("click", function () {
//         mainViewBorders = !mainViewBorders;
//         mainBorderBut.text(mainViewBorders ? "Hide borders" : "Show borders");
//         mainDraw();
//     });
// mainDiv.append("h3")
//     .text("Language")
// var mainLabelBut = mainDiv.append("button")
//     .text("Hide labels")
//     .on("click", function () {
//         mainViewLabels = !mainViewLabels;
//         mainLabelBut.text(mainViewLabels ? "Hide labels" : "Show labels");
//         mainDraw();
//     });
// mainDiv.append("button")
//     .text("New labels")
//     .on("click", function () {
//         mainDraw();
//     });
// mainDiv.append("button")
//     .text("New language")
//     .on("click", function () {
//         mainRender.lang = makeRandomLanguage();
//         mainDraw();
//     });

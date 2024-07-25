let filteredData = [];
let fetchImages = true; // Declared with let for proper scope handling

let nodesToDisplay;

// Fetch node positions and CSV data
// Fetch node positions and CSV data
Promise.all([
    fetch("data/node_positions.json").then(response => response.json()),
    d3.dsv(';', "data/personal_data.csv"),
    loadSVGSymbol('static/male-svgrepo-com.svg'),
    loadSVGSymbol('static/female-svgrepo-com.svg')
]).then(([nodePositions, csvData, male_symbol,female_symbol]) => {
    nodesToDisplay = nodePositions;
    const { colorMap, graySurnames } = initializeColorMap(csvData);

    filteredData = filterAndPositionData(csvData, nodesToDisplay, colorMap);
    const links = defineLinks(filteredData);

    var svg = d3.select("#tree");

    console.log(filteredData)

    drawLinks(svg, links);
    drawNodes(svg, filteredData, colorMap, male_symbol, female_symbol);
    addZoom(svg);
    setupEventListeners(svg);
    setupLegend(colorMap, graySurnames);
});

function initializeColorMap(data) {
    const colorMap = {};
    const surnameCounts = {};
    const uniqueSurnames = [...new Set(data.map(({ Surname }) => Surname))];
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
    const graySurnames = new Set();

    data.forEach(d => {
        surnameCounts[d.Surname] = (surnameCounts[d.Surname] || 0) + 1;
    });

    uniqueSurnames.forEach((surname, index) => {
        colorMap[surname] = colorScale(index);
    });

    const predefinedColors = {
        "Been": "#e6b185",
        "Veringa": "#d89aea",
        "Kuijpers": "#ca2525",
        "": "#838383"
    };

    console.log(surnameCounts)
    Object.assign(colorMap, predefinedColors);

    uniqueSurnames.forEach((surname, index) => {
        if (!colorMap[surname]) {
            colorMap[surname] = colorScale(index);
        }

        if (surnameCounts[surname] === 1) {
            colorMap[surname] = "#838383";
            graySurnames.add(surname);
        }
    });

    return {colorMap, graySurnames};
}


function setDynamicFontSizes(selection, d) {
    const baseFontSize = 0; // Base font size in pixels
    const scaleFactor = 0.3; // Scale factor relative to node size

    // Calculate scaled font sizes
    const fontSize = Math.min(d.boxSize.width, d.boxSize.height) * scaleFactor;
    const nameFontSize = fontSize * 0.7; // 50% of the node font size
    const nicknameFontSize = fontSize * 0.65; // 40% of the node font size
    const titleFontSize = fontSize * 0.65; // 60% of the node font size

    selection
        .style("--node-name-font-size", `${nameFontSize}px`)
        .style("--node-nickname-font-size", `${nicknameFontSize}px`)
        .style("--node-title-font-size", `${titleFontSize}px`);
}

function filterAndPositionData(data, nodesToDisplay, colorMap) {




    return data
        .filter(({ ID }) => nodesToDisplay.some(({ id }) => id == ID))
        .map(d => {
            const node = nodesToDisplay.find(({ id }) => id == d.ID);
            const { x, y } = node;
            const boxSize = { width: 100, height: 60 }; // Use size based on importance or default

            return {
                ...d,
                x,
                y,
                boxSize,
                color: colorMap[d.Surname] || d3.schemeCategory10[0]
            };
        });
}


function loadSVGSymbol(url) {
    return d3.xml(url).then(data => data.documentElement);
}
function drawNodes(svg, filteredData, colorMap, maleSymbol, femaleSymbol) {
    // Select the group element within the SVG for nodes
    var g = svg.select("g");

        const sexColorMap = {
        'Male': '#2571dd',  // Blue
        'Female': '#ff00a7', // Orange
        'Other': '#2ca02c',  // Green
        'Unknown': '#d62728' // Red
    };


    // Append node groups
    var node = g.selectAll(".node")
        .data(filteredData)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x},${d.y})`)
        .each(function(d) { setDynamicFontSizes(d3.select(this), d); }); // Apply dynamic font sizes

    // Append rectangles for nodes
node.append("rect")
    .attr("x", d => -d.boxSize.width / 2 - 4)  // Adjust for outer border
    .attr("y", d => -d.boxSize.height / 2 - 4) // Adjust for outer border
    .attr("width", d => d.boxSize.width + 8)   // Adjust for outer border
    .attr("height", d => d.boxSize.height + 8) // Adjust for outer border
    .attr("rx", 19) // Rounded corners (slightly larger than the inner rect)
    .attr("ry", 19)
    .style("fill", "none")
    // .style("stroke", d => sexColorMap[d.Sex] || "none")
    // .style("stroke-width", d => sexColorMap[d.Sex] ? 7 : 0);

node.append("rect")
    .attr("x", d => -d.boxSize.width / 2)
    .attr("y", d => -d.boxSize.height / 2)
    .attr("width", d => d.boxSize.width)
    .attr("height", d => d.boxSize.height)
    .attr("rx", 15) // Rounded corners
    .attr("ry", 15)
    .style("fill", d => d.color)
    // .style("stroke", d => sexColorMap[d.Sex] ? "black" : "none") // Inner border color
    // .style("stroke-width", d => sexColorMap[d.Sex] ? 3 : 0); // Inner border width

    // Add text labels inside the nodes
    node.append("foreignObject")
        .attr("width", d => d.boxSize.width)
        .attr("height", d => d.boxSize.height)
        .attr("x", d => -d.boxSize.width / 2)
        .attr("y", d => -d.boxSize.height / 2)
        .append("xhtml:div")
        .attr("class", "node-label") // Apply a class for styling
        .html(d => `
            <div class="node-name">${d.Name}</div>
        `);

 node.each(function(d) {
        const group = d3.select(this);

        if (d.Sex === "Male" && maleSymbol) {
                        const maleSymbolNode = maleSymbol.cloneNode(true);
            // Update stroke color
            maleSymbolNode.querySelectorAll('*').forEach(el => {
                el.setAttribute('stroke', d.color);
                el.setAttribute('stroke-width', '2'); // Adjust as needed
            });
            group.append(() => maleSymbolNode)
                .attr("x", d  => d.boxSize.width/2 - 5)  // Adjust as needed
                .attr("y", d  => -d.boxSize.width/2 + 5) // Adjust as needed
                .attr("width", 20) // Adjust size as needed
                .attr("height", 20); // Adjust size as needed
        } else if (d.Sex === "Female" && femaleSymbol) {
            const femaleSymbolNode = femaleSymbol.cloneNode(true);
            // Update stroke color
            femaleSymbolNode.querySelectorAll('*').forEach(el => {
                el.setAttribute('stroke', d.color);
                el.setAttribute('stroke-width', '2'); // Adjust as needed
            });

            group.append(() => femaleSymbolNode)
                .attr("x", d  => d.boxSize.width/2 - 5) // Adjust as needed
                .attr("y", d  => -d.boxSize.width/2 + 5) // Adjust as needed
                .attr("width", 20) // Adjust size as needed
                .attr("height", 20)// Adjust size as needed
        }
    });

    // Add birth and death years below the node box
    node.append("text")
        .attr("x", 0)
        .attr("y", d => d.boxSize.height / 2 + 12) // Adjust position as needed
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr("class", 'node-sub-years')
        .style("fill", d => d.color)
        .each(function(d) {
            // Define birth and death values
            const birthYear = d['DateOfBirth'] ? d['DateOfBirth'].split('-').pop() : '\u00A0\u00A0???\u00A0\u00A0';
            const deathYear = d['DateOfDeath'] ? d['DateOfDeath'].split('-').pop() : '\u00A0\u00A0???\u00A0\u00A0';
            const dash = '\u00A0\u00A0-\u00A0\u00A0';

            // Measure each text segment
            const birthWidth = measureTextWidth(birthYear, this);
            const dashWidth = measureTextWidth(deathYear, this);

            // Update the text content
            d3.select(this).text(`${birthYear}${dash}${deathYear}`);
        });


    // Helper function to measure text width
function measureTextWidth(text, element) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = getComputedStyle(element).font;
    return context.measureText(text).width;
}


}


function setupLegend(colorMap, graySurnames) {
    // Select the legend container or create it if it doesn't exist
    const legend = d3.select("#legend")
        .append("svg")
        .attr("width", 200)
        .attr("height", 350)
        .attr("class", "legend");

    // Filter out gray houses for the main legend
    const filteredHouses = Object.keys(colorMap).filter(house => !graySurnames.has(house));
    filteredHouses.sort();

    // Create legend items for each house
    const legendItems = legend.selectAll(".legend-item")
        .data(filteredHouses)
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(10, ${i * 20 + 10})`);

    // Append color rectangles to the legend items
    legendItems.append("rect")
        .attr("x", 0)
        .attr("width", 12)
        .attr("height", 12)
        .style("fill", d => colorMap[d]);

    // Append house names to the legend items
    legendItems.append("text")
        .attr("x", 20)
        .attr("y", 6)
        .attr("dy", "0.35em")
        .text(d => d)
        .style("fill", "white"); // Set text color to black

    // Add a section for gray houses, if any
    if (graySurnames.size > 0) {
        const grayLegend = legend.append("g")
            .attr("class", "gray-legend")
            .attr("transform", `translate(10, ${filteredHouses.length * 20 + 30})`);

        grayLegend.append("rect")
            .attr("x", 0)
            .attr("width", 12)
            .attr("height", 12)
            .style("fill", "#838383");

        grayLegend.append("text")
            .attr("x", 20)
            .attr("y", 6)
            .attr("dy", "0.35em")
            .style("fill", "white");
    }
}

function addZoom(svg) {
    const zoom = d3.zoom()
        .scaleExtent([0.2, 2])
        .on("zoom", event => svg.select("g").attr("transform", event.transform));

    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(1000, 1000).scale(0.8));
}

function setupEventListeners(svg) {
    // Handle node click event
    svg.selectAll(".node")
        .on("click", function (event, d) {
            showPersonInfo(d); // Show information about the clicked person
        });

    // Handle close button click
    document.querySelector(".close-btn").addEventListener("click", function () {
        document.querySelector(".side-panel").classList.remove("open");
    });

    // Handle toggle images button click
    var toggleButton = document.getElementById("toggle-images-btn");
    toggleButton.addEventListener("click", function () {
        fetchImages = !fetchImages; // Toggle image fetching
        toggleButton.textContent = fetchImages ? "Hide Images" : "Show Images";
        toggleButton.classList.toggle("active", fetchImages);
    });
}

async function showPersonInfo(person) {
    console.log(person)
    const { Name, ['DateOfBirth']: birthYear, ['DateOfDeath']: deathYear } = person;

    var sidePanel = document.querySelector(".side-panel");
    var personInfo = document.getElementById("person-info");

    const father = filteredData.find(({ ID }) => ID === person['Father_id']);
    const mother = filteredData.find(({ ID }) => ID === person['Mother_id']);
    const partner = filteredData.find(({ ID }) => ID == person['Partner_id']);

    // Populate the side panel with the person's info
    personInfo.innerHTML = `
            <h2>${person.Name}</h2>
            <p><strong>Birth:</strong> <a href="${person['URLDateOfBirth']}">${person['DateOfBirth']} </a> <a href="${person['URLPlaceOfBirth']}"> ${person['PlaceOfBirth']}</a></p>
            <p><strong>Death:</strong> <a href="${person['URLDateOfDeath']}">${person['DateOfDeath']} </a> <a href="${person['URLPlaceOfDeath']}"> ${person['PlaceOfDeath']}</a></p>
            <hr>
            <p><strong><a href="${person['URLProfession']}">Father:</a></strong> ${father ? father.Name : ''}</p>
            <p><strong><a href="${person['URLProfession']}">Mother:</a></strong> ${mother ? mother.Name : ''}</p>
            <p><strong><a href="${person['URLProfession']}">Partner:</a></strong> ${partner ? partner.Name : ''}</p>
            <p><strong><a href="${person['URLProfession']}">Marriage:</a></strong> ${person['DateOfMarriage']} ${person['PlaceOfMarriage']}</p>
            <hr>
            <p><strong><a href="${person['URLProfession']}">Profession:</a></strong> ${person['Profession'] ? person['Profession'] : ''} </p>

            <p></p>
        `;

    // Fetch and display the image
    // if (fetchImages) {
    //     console.log('loading')
    //     const imageURL = await fetchWikipediaImageURL(person['Wikipedia Link']);
    //     if (imageURL) {
    //         personInfo.innerHTML += `<img src="${imageURL}" alt="${person.Name}">`;
    //     }
    // }

    // Show the side panel
    d3.select(".side-panel").style("background-color", person.color);

    sidePanel.classList.add("open");
}

async function fetchWikipediaImageURL(wikipediaLink) {
    try {
        const pageTitle = wikipediaLink.split('/').pop();
        const apiURL = `https://en.wikipedia.org/w/api.php?action=query&titles=${pageTitle}&prop=pageimages&format=json&pithumbsize=200&origin=*`;

        const response = await fetch(apiURL);
        const data = await response.json();
        const pages = data.query.pages;
        const page = Object.values(pages)[0];

        if (page.thumbnail && page.thumbnail.source) {
            return page.thumbnail.source;
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching Wikipedia API:', error);
        return null;
    }
}


function generateLinkPath(d) {
    var startX = d.source.x;
    var startY = d.source.y;
    var endX = d.target.x;
    var endY = d.target.y;

    // Create a path string for the link
    var path = `M ${startX},${startY} `; // Move to starting point
    var VDistance = endY - startY;
    var midY = startY + VDistance / 5 * 3;

    path += `V ${midY} `;
    path += `H ${endX} `;
    path += `V ${endY} `;

    return path;
}

function drawLinks(svg, links) {
    var g = svg.select("g");

    // Draw links
    g.selectAll(".link")
        .data(links)
        .enter().append("path")
        .attr("class", "link")
        .attr("d", generateLinkPath) // Use the helper function to generate path
        .style("stroke", d => d.color)
        .style("fill", "none")
        .style("stroke-width", 4); // Adjust the stroke width as needed
}

function defineLinks(filteredData) {
    const links = [];

    filteredData.forEach(child => {
        const { ['Father_id']: fatherId, ['Mother_id']: motherId, ['Partner_id']: partnerId } = child;

        const father = filteredData.find(({ ID }) => ID == fatherId);
        const mother = filteredData.find(({ ID }) => ID == motherId);
        const partner = filteredData.find(({ ID }) => ID == partnerId);

            if (partner && child) {
            links.push({source: partner, target: child, color: partner.color});
        }

        if (father && mother && child) {
            const midpointnode = {x: (mother.x - father.x) / 2 + father.x, y: father.y};
            links.push({source: father, target: mother, color: father.color});
            links.push({source: midpointnode, target: child, color: father.color});
            return;
        }

        if (father && child) {
            links.push({source: father, target: child, color: father.color});
        }

        if (partner && child) {
            links.push({source: partner, target: child, color: partner.color});
        }
    });

    return links;
}

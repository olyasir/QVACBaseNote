/**
 * Perfumery Notes Visualization Generator
 *
 * Creates a 2D scatter plot clustering essential oils by their perfumery note position:
 * - TOP NOTES: Quick-evaporating oils that provide first impression
 * - MIDDLE NOTES: Heart of the blend, lasting 2-4 hours
 * - BASE NOTES: Foundation oils that anchor the blend, lasting 6+ hours
 */

const fs = require('fs');
const path = require('path');
const essentialOils = require('./essentialOils.js');

class PerfumeryNotesVisualization {
  constructor() {
    // Perfumery note classification based on professional perfumery principles
    this.noteClassification = {
      TOP: {
        description: "Light, volatile oils that evaporate quickly (5-30 minutes). Provide the first impression.",
        color: "#FFD700", // Gold
        oils: []
      },
      MIDDLE: {
        description: "Heart of the blend, moderate evaporation (2-4 hours). Main character of the scent.",
        color: "#FF69B4", // Hot Pink
        oils: []
      },
      BASE: {
        description: "Heavy, long-lasting oils (6+ hours). Foundation that anchors the blend.",
        color: "#8B4513", // Saddle Brown
        oils: []
      }
    };
  }

  classifyOilsByPerfumeryNotes() {
    Object.entries(essentialOils).forEach(([oilName, oilData]) => {
      const noteType = this.determineNoteType(oilData);
      this.noteClassification[noteType].oils.push({
        name: oilName,
        data: oilData,
        noteType: noteType
      });
    });
  }

  determineNoteType(oilData) {
    const { category, intensity } = oilData;

    // TOP NOTES: Light, fresh, citrus oils and strong fresh herbs
    if (category === 'citrus' ||
        (category === 'herbal' && intensity === 'strong' && oilData.notes.includes('fresh'))) {
      return 'TOP';
    }

    // BASE NOTES: Heavy, woody, earthy oils and high-intensity oils
    if (category === 'woody' ||
        category === 'earthy' ||
        category === 'resinous' ||
        intensity === 'heavy') {
      return 'BASE';
    }

    // MIDDLE NOTES: Everything else (florals, medium herbs, spices)
    return 'MIDDLE';
  }

  generateCoordinates() {
    const embeddings = {};

    // Define cluster centers for each note type
    const clusterCenters = {
      TOP: { x: 0.6, y: 0.7 },    // Upper right
      MIDDLE: { x: 0, y: 0 },      // Center
      BASE: { x: -0.6, y: -0.7 }   // Lower left
    };

    // Add some spread within each cluster
    Object.entries(this.noteClassification).forEach(([noteType, data]) => {
      const center = clusterCenters[noteType];
      const oils = data.oils;

      oils.forEach((oil, index) => {
        // Create scattered positions around cluster center
        const angle = (index / oils.length) * 2 * Math.PI;
        const radius = 0.3 + Math.random() * 0.2; // Random radius for natural spread

        embeddings[oil.name] = {
          x: center.x + radius * Math.cos(angle),
          y: center.y + radius * Math.sin(angle),
          noteType: noteType,
          category: oil.data.category,
          notes: oil.data.notes,
          intensity: oil.data.intensity,
          description: oil.data.description
        };
      });
    });

    return embeddings;
  }

  generateVisualizationData() {
    this.classifyOilsByPerfumeryNotes();
    const embeddings = this.generateCoordinates();

    // Create color mapping for note types
    const noteTypeColors = {
      TOP: "#FFD700",    // Gold
      MIDDLE: "#FF69B4", // Hot Pink
      BASE: "#8B4513"    // Saddle Brown
    };

    return {
      embeddings,
      noteTypeColors,
      noteClassification: this.noteClassification,
      metadata: {
        totalOils: Object.keys(embeddings).length,
        topNotes: this.noteClassification.TOP.oils.length,
        middleNotes: this.noteClassification.MIDDLE.oils.length,
        baseNotes: this.noteClassification.BASE.oils.length,
        generatedAt: new Date().toISOString()
      }
    };
  }

  generateHTML(data) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Essential Oils - Perfumery Notes Clustering</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 30px;
            backdrop-filter: blur(10px);
        }
        h1 {
            text-align: center;
            margin-bottom: 10px;
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .subtitle {
            text-align: center;
            margin-bottom: 30px;
            font-size: 1.2em;
            opacity: 0.9;
        }
        .legend {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.2);
            padding: 10px 15px;
            border-radius: 15px;
            backdrop-filter: blur(5px);
        }
        .legend-color {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid white;
        }
        .chart-container {
            background: rgba(255, 255, 255, 0.9);
            border-radius: 15px;
            padding: 20px;
            margin: 20px 0;
        }
        .tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
            max-width: 300px;
            z-index: 1000;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.2);
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            backdrop-filter: blur(5px);
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            display: block;
        }
        .note-description {
            background: rgba(255, 255, 255, 0.15);
            padding: 15px;
            border-radius: 10px;
            margin: 10px 0;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌸 Essential Oils Perfumery Notes</h1>
        <p class="subtitle">2D visualization clustering oils by their perfumery note position (TOP • MIDDLE • BASE)</p>

        <div class="legend">
            <div class="legend-item">
                <div class="legend-color" style="background-color: #FFD700;"></div>
                <span><strong>TOP NOTES</strong> - First impression (5-30 min)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #FF69B4;"></div>
                <span><strong>MIDDLE NOTES</strong> - Heart of blend (2-4 hours)</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #8B4513;"></div>
                <span><strong>BASE NOTES</strong> - Foundation (6+ hours)</span>
            </div>
        </div>

        <div class="chart-container">
            <svg id="perfumery-plot"></svg>
        </div>

        <div class="stats">
            <div class="stat-card">
                <span class="stat-number">${data.metadata.topNotes}</span>
                <span>Top Notes</span>
                <div class="note-description">${data.noteClassification.TOP.description}</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${data.metadata.middleNotes}</span>
                <span>Middle Notes</span>
                <div class="note-description">${data.noteClassification.MIDDLE.description}</div>
            </div>
            <div class="stat-card">
                <span class="stat-number">${data.metadata.baseNotes}</span>
                <span>Base Notes</span>
                <div class="note-description">${data.noteClassification.BASE.description}</div>
            </div>
        </div>
    </div>

    <div class="tooltip" id="tooltip"></div>

    <script>
        const data = ${JSON.stringify(data, null, 2)};

        // Set up SVG dimensions
        const margin = {top: 20, right: 20, bottom: 20, left: 20};
        const width = 800 - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;

        const svg = d3.select("#perfumery-plot")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        const g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Create scales
        const xExtent = d3.extent(Object.values(data.embeddings), d => d.x);
        const yExtent = d3.extent(Object.values(data.embeddings), d => d.y);

        const xScale = d3.scaleLinear()
            .domain([xExtent[0] - 0.1, xExtent[1] + 0.1])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([yExtent[0] - 0.1, yExtent[1] + 0.1])
            .range([height, 0]);

        // Create tooltip
        const tooltip = d3.select("#tooltip");

        // Draw points
        Object.entries(data.embeddings).forEach(([oilName, oilData]) => {
            g.append("circle")
                .attr("cx", xScale(oilData.x))
                .attr("cy", yScale(oilData.y))
                .attr("r", 8)
                .attr("fill", data.noteTypeColors[oilData.noteType])
                .attr("stroke", "#333")
                .attr("stroke-width", 2)
                .attr("opacity", 0.8)
                .style("cursor", "pointer")
                .on("mouseover", function(event) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("r", 12)
                        .attr("opacity", 1);

                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 1);

                    tooltip.html(
                        "<strong>" + oilName.toUpperCase() + "</strong><br/>" +
                        "<strong>Note Type:</strong> " + oilData.noteType + "<br/>" +
                        "<strong>Category:</strong> " + oilData.category + "<br/>" +
                        "<strong>Intensity:</strong> " + oilData.intensity + "<br/>" +
                        "<strong>Description:</strong> " + oilData.description + "<br/>" +
                        "<strong>Notes:</strong> " + oilData.notes.join(', ')
                    )
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mouseout", function() {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("r", 8)
                        .attr("opacity", 0.8);

                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0);
                });

            // Add labels
            g.append("text")
                .attr("x", xScale(oilData.x))
                .attr("y", yScale(oilData.y) - 15)
                .attr("text-anchor", "middle")
                .attr("font-size", "12px")
                .attr("font-weight", "bold")
                .attr("fill", "#333")
                .style("pointer-events", "none")
                .text(oilName);
        });

        // Add note type labels
        const noteTypePositions = {
            TOP: {x: 0.6, y: 0.7, label: "TOP NOTES\\n(First Impression)"},
            MIDDLE: {x: 0, y: 0, label: "MIDDLE NOTES\\n(Heart of Blend)"},
            BASE: {x: -0.6, y: -0.7, label: "BASE NOTES\\n(Foundation)"}
        };

        Object.entries(noteTypePositions).forEach(([noteType, pos]) => {
            g.append("text")
                .attr("x", xScale(pos.x))
                .attr("y", yScale(pos.y) + 80)
                .attr("text-anchor", "middle")
                .attr("font-size", "16px")
                .attr("font-weight", "bold")
                .attr("fill", data.noteTypeColors[noteType])
                .attr("opacity", 0.7)
                .selectAll("tspan")
                .data(pos.label.split("\\n"))
                .enter()
                .append("tspan")
                .attr("x", xScale(pos.x))
                .attr("dy", (d, i) => i === 0 ? 0 : "1.2em")
                .text(d => d);
        });
    </script>
</body>
</html>`;
  }

  async generate() {
    console.log('🎨 Generating perfumery notes visualization...');

    const data = this.generateVisualizationData();

    // Generate HTML file
    const htmlContent = this.generateHTML(data);
    const htmlPath = path.join(__dirname, 'public', 'perfumery-notes.html');
    fs.writeFileSync(htmlPath, htmlContent);

    // Save JSON data
    const jsonPath = path.join(__dirname, 'public', 'perfumery-notes.json');
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));

    console.log('✅ Perfumery notes visualization generated!');
    console.log(`📁 HTML: ${htmlPath}`);
    console.log(`📊 JSON: ${jsonPath}`);
    console.log('🌐 Open in browser: http://localhost:3000/perfumery-notes.html');

    return {
      htmlPath,
      jsonPath,
      data
    };
  }
}

// Generate the visualization
const generator = new PerfumeryNotesVisualization();
generator.generate().catch(console.error);

module.exports = PerfumeryNotesVisualization;
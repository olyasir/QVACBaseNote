/**
 * Fast AI Demo - 6 Oils Only
 * Quick demonstration of AI-powered clustering
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const essentialOils = require('./essentialOils.js');

class FastAIDemo {
  constructor() {
    // Use only 6 oils for quick demo
    this.demoOils = ['lavender', 'bergamot', 'sandalwood', 'peppermint', 'rose', 'cedarwood'];
    this.similarities = {};
    this.embeddings = {};
  }

  async getLLMSimilarity(oil1, oil2) {
    return new Promise((resolve) => {
      const oil1Data = essentialOils[oil1];
      const oil2Data = essentialOils[oil2];

      console.log(`🤖 AI analyzing: ${oil1} vs ${oil2}`);

      const bare = spawn('bare', [
        'aiNoteSimilarityBare.js',
        oil1,
        oil2,
        JSON.stringify(oil1Data),
        JSON.stringify(oil2Data)
      ], {
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';

      bare.stdout.on('data', (data) => {
        output += data.toString();
      });

      bare.on('close', (code) => {
        const lines = output.split('\n');
        let similarity = 0.5;

        for (const line of lines) {
          if (line.startsWith('SIMILARITY_RESULT:')) {
            const score = line.replace('SIMILARITY_RESULT:', '');
            similarity = Math.max(0, Math.min(1, parseFloat(score) || 0.5));
            break;
          }
        }

        console.log(`✅ AI similarity ${oil1}-${oil2}: ${similarity}`);
        resolve(similarity);
      });

      bare.on('error', () => {
        console.log(`❌ Fallback for ${oil1}-${oil2}`);
        resolve(this.getFallbackSimilarity(oil1, oil2));
      });

      setTimeout(() => {
        if (!bare.killed) {
          bare.kill('SIGTERM');
          resolve(this.getFallbackSimilarity(oil1, oil2));
        }
      }, 120000); // 2 minute timeout per comparison
    });
  }

  getFallbackSimilarity(oil1, oil2) {
    const data1 = essentialOils[oil1];
    const data2 = essentialOils[oil2];

    let similarity = 0;

    // Category similarity
    if (data1.category === data2.category) similarity += 0.4;

    // Intensity similarity
    const intensityMap = { light: 1, medium: 2, strong: 3, heavy: 4 };
    const intensityDiff = Math.abs(intensityMap[data1.intensity] - intensityMap[data2.intensity]);
    similarity += (4 - intensityDiff) / 4 * 0.3;

    // Note overlap
    const notes1 = new Set(data1.notes);
    const notes2 = new Set(data2.notes);
    const intersection = new Set([...notes1].filter(x => notes2.has(x)));
    const union = new Set([...notes1, ...notes2]);
    similarity += (intersection.size / union.size) * 0.3;

    return Math.max(0, Math.min(1, similarity));
  }

  async generateSimilarities() {
    console.log('🧠 Generating AI similarities for 6 oils...');
    console.log(`📊 ${this.demoOils.length * (this.demoOils.length - 1) / 2} comparisons total`);

    let completed = 0;
    const total = this.demoOils.length * (this.demoOils.length - 1) / 2;

    for (let i = 0; i < this.demoOils.length; i++) {
      for (let j = i + 1; j < this.demoOils.length; j++) {
        const oil1 = this.demoOils[i];
        const oil2 = this.demoOils[j];

        const similarity = await this.getLLMSimilarity(oil1, oil2);

        this.similarities[`${oil1}-${oil2}`] = similarity;
        this.similarities[`${oil2}-${oil1}`] = similarity;

        completed++;
        console.log(`⚡ Progress: ${Math.round((completed / total) * 100)}% (${completed}/${total})`);
      }
    }

    // Self-similarity
    this.demoOils.forEach(oil => {
      this.similarities[`${oil}-${oil}`] = 1.0;
    });

    console.log('✅ AI similarities complete!');
  }

  generateEmbeddings() {
    console.log('📐 Converting to 2D coordinates...');

    // Simple force-directed layout based on similarities
    const coords = {};

    // Initialize random positions
    this.demoOils.forEach(oil => {
      coords[oil] = {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2
      };
    });

    // Iterative improvement
    for (let iter = 0; iter < 200; iter++) {
      const forces = {};
      this.demoOils.forEach(oil => {
        forces[oil] = { x: 0, y: 0 };
      });

      // Calculate forces between all pairs
      for (let i = 0; i < this.demoOils.length; i++) {
        for (let j = i + 1; j < this.demoOils.length; j++) {
          const oil1 = this.demoOils[i];
          const oil2 = this.demoOils[j];

          const dx = coords[oil1].x - coords[oil2].x;
          const dy = coords[oil1].y - coords[oil2].y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;

          const similarity = this.similarities[`${oil1}-${oil2}`];
          const targetDistance = 1 - similarity; // High similarity = low distance

          const force = (distance - targetDistance) * 0.1;

          forces[oil1].x -= force * dx / distance;
          forces[oil1].y -= force * dy / distance;
          forces[oil2].x += force * dx / distance;
          forces[oil2].y += force * dy / distance;
        }
      }

      // Apply forces
      this.demoOils.forEach(oil => {
        coords[oil].x += forces[oil].x;
        coords[oil].y += forces[oil].y;
      });
    }

    // Create embeddings
    this.demoOils.forEach(oil => {
      this.embeddings[oil] = {
        x: coords[oil].x,
        y: coords[oil].y,
        category: essentialOils[oil].category,
        notes: essentialOils[oil].notes,
        intensity: essentialOils[oil].intensity,
        description: essentialOils[oil].description
      };
    });

    console.log('✅ 2D embeddings generated!');
  }

  generateHTML() {
    const categoryColors = {
      citrus: "#FFA500",
      floral: "#FF69B4",
      herbal: "#90EE90",
      woody: "#8B4513",
      earthy: "#A0522D",
      resinous: "#DAA520",
      spice: "#DC143C"
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fast AI Demo - Essential Oils Clustering</title>
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
            max-width: 1000px;
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
            margin-bottom: 20px;
            font-size: 1.2em;
            opacity: 0.9;
        }
        .demo-badge {
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
            margin: 10px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
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
        .similarities {
            background: rgba(255, 255, 255, 0.15);
            padding: 15px;
            border-radius: 10px;
            margin-top: 20px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 Fast AI Demo</h1>
        <p class="subtitle">AI-powered clustering of 6 essential oils based on perfumery note analysis</p>
        <div class="demo-badge">🧠 Each dot positioned by AI similarity analysis</div>

        <div class="chart-container">
            <svg id="ai-demo-plot"></svg>
        </div>

        <div class="similarities">
            <h3>🔗 AI Similarity Scores:</h3>
            <div id="similarity-list"></div>
        </div>
    </div>

    <div class="tooltip" id="tooltip"></div>

    <script>
        const embeddings = ${JSON.stringify(this.embeddings, null, 2)};
        const similarities = ${JSON.stringify(this.similarities, null, 2)};
        const categoryColors = ${JSON.stringify(categoryColors, null, 2)};

        // Display similarities
        const simList = document.getElementById('similarity-list');
        const oils = Object.keys(embeddings);
        let simHtml = '';

        for (let i = 0; i < oils.length; i++) {
            for (let j = i + 1; j < oils.length; j++) {
                const oil1 = oils[i];
                const oil2 = oils[j];
                const sim = similarities[oil1 + '-' + oil2];
                const percentage = Math.round(sim * 100);
                simHtml += oil1 + ' ↔ ' + oil2 + ': <strong>' + percentage + '%</strong><br/>';
            }
        }
        simList.innerHTML = simHtml;

        // Set up SVG
        const margin = {top: 20, right: 20, bottom: 20, left: 20};
        const width = 600 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select("#ai-demo-plot")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        const g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Create scales
        const xExtent = d3.extent(Object.values(embeddings), d => d.x);
        const yExtent = d3.extent(Object.values(embeddings), d => d.y);

        const xScale = d3.scaleLinear()
            .domain([xExtent[0] - 0.2, xExtent[1] + 0.2])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([yExtent[0] - 0.2, yExtent[1] + 0.2])
            .range([height, 0]);

        const tooltip = d3.select("#tooltip");

        // Draw points
        Object.entries(embeddings).forEach(([oilName, oilData]) => {
            g.append("circle")
                .attr("cx", xScale(oilData.x))
                .attr("cy", yScale(oilData.y))
                .attr("r", 12)
                .attr("fill", categoryColors[oilData.category])
                .attr("stroke", "#333")
                .attr("stroke-width", 3)
                .attr("opacity", 0.8)
                .style("cursor", "pointer")
                .on("mouseover", function(event) {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("r", 16)
                        .attr("opacity", 1);

                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 1);

                    tooltip.html(
                        "<strong>" + oilName.toUpperCase() + "</strong><br/>" +
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
                        .attr("r", 12)
                        .attr("opacity", 0.8);

                    tooltip.transition()
                        .duration(200)
                        .style("opacity", 0);
                });

            // Add labels
            g.append("text")
                .attr("x", xScale(oilData.x))
                .attr("y", yScale(oilData.y) - 20)
                .attr("text-anchor", "middle")
                .attr("font-size", "14px")
                .attr("font-weight", "bold")
                .attr("fill", "#333")
                .style("pointer-events", "none")
                .text(oilName);
        });

        // Add title
        g.append("text")
            .attr("x", width / 2)
            .attr("y", -5)
            .attr("text-anchor", "middle")
            .attr("font-size", "16px")
            .attr("font-weight", "bold")
            .attr("fill", "#333")
            .text("AI-Clustered Essential Oils by Similarity");
    </script>
</body>
</html>`;
  }

  async generate() {
    console.log('🚀 Fast AI Demo - 6 Essential Oils');
    console.log('Oils:', this.demoOils.join(', '));

    try {
      await this.generateSimilarities();
      this.generateEmbeddings();

      const htmlContent = this.generateHTML();
      const htmlPath = path.join(__dirname, 'public', 'fast-ai-demo.html');
      fs.writeFileSync(htmlPath, htmlContent);

      const dataPath = path.join(__dirname, 'public', 'fast-ai-data.json');
      fs.writeFileSync(dataPath, JSON.stringify({
        embeddings: this.embeddings,
        similarities: this.similarities,
        oils: this.demoOils,
        metadata: {
          totalOils: this.demoOils.length,
          totalComparisons: Object.keys(this.similarities).length / 2,
          generatedAt: new Date().toISOString(),
          method: 'AI-powered fast demo'
        }
      }, null, 2));

      console.log('✅ Fast AI demo generated!');
      console.log(`📁 HTML: ${htmlPath}`);
      console.log(`📊 Data: ${dataPath}`);
      console.log('🌐 View at: http://localhost:3000/fast-ai-demo.html');

    } catch (error) {
      console.error('❌ Demo failed:', error);
    }
  }
}

const demo = new FastAIDemo();
demo.generate().catch(console.error);
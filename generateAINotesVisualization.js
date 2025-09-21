/**
 * AI-Powered Notes Clustering Visualization
 *
 * Uses the LLM to intelligently analyze and cluster essential oils
 * by their note characteristics, creating embeddings based on AI understanding
 * rather than rule-based classification.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const essentialOils = require('./essentialOils.js');

class AINotesVisualization {
  constructor() {
    this.oils = Object.keys(essentialOils);
    this.similarities = {};
    this.embeddings = {};
  }

  /**
   * Ask LLM to analyze the perfumery note characteristics of two oils
   * and provide a similarity score based on their note positions
   */
  async getLLMNoteSimilarity(oil1, oil2) {
    return new Promise((resolve) => {
      const oil1Data = essentialOils[oil1];
      const oil2Data = essentialOils[oil2];

      const prompt = `You are an expert perfumer analyzing essential oil note characteristics.

OIL 1: ${oil1}
- Notes: ${oil1Data.notes.join(', ')}
- Intensity: ${oil1Data.intensity}
- Category: ${oil1Data.category}
- Description: ${oil1Data.description}

OIL 2: ${oil2}
- Notes: ${oil2Data.notes.join(', ')}
- Intensity: ${oil2Data.intensity}
- Category: ${oil2Data.category}
- Description: ${oil2Data.description}

Analyze these oils based on their PERFUMERY NOTE POSITION (TOP/MIDDLE/BASE) and scent characteristics.

Consider:
- Evaporation rate and volatility
- Note position in a perfume pyramid
- Scent intensity and longevity
- Aromatic compatibility and blending harmony

Rate their similarity on a scale of 0.0 to 1.0:
- 1.0 = Very similar note positions and characteristics
- 0.5 = Moderately compatible, different note positions
- 0.0 = Very different note positions and incompatible

Respond with only a number between 0.0 and 1.0`;

      // Call LLM via Bare runtime
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
      let errorOutput = '';

      bare.stdout.on('data', (data) => {
        output += data.toString();
      });

      bare.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      bare.on('close', (code) => {
        if (code === 0) {
          // Extract similarity score from output
          const lines = output.split('\n');
          let similarity = 0.5; // Default fallback

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('SIMILARITY_RESULT:')) {
              const score = trimmed.replace('SIMILARITY_RESULT:', '');
              similarity = Math.max(0, Math.min(1, parseFloat(score)));
              break;
            }
          }

          console.log(`🤖 AI similarity ${oil1}-${oil2}: ${similarity}`);
          resolve(similarity);
        } else {
          console.error(`❌ Failed to get AI similarity for ${oil1}-${oil2}:`, errorOutput);
          // Fallback to rule-based similarity
          resolve(this.getFallbackSimilarity(oil1, oil2));
        }
      });

      bare.on('error', (error) => {
        console.error(`❌ Error calling LLM for ${oil1}-${oil2}:`, error.message);
        resolve(this.getFallbackSimilarity(oil1, oil2));
      });

      // Timeout after 3 minutes
      setTimeout(() => {
        if (!bare.killed) {
          bare.kill('SIGTERM');
          console.log(`⏰ Timeout for ${oil1}-${oil2}, using fallback`);
          resolve(this.getFallbackSimilarity(oil1, oil2));
        }
      }, 180000);
    });
  }

  /**
   * Fallback similarity calculation based on oil characteristics
   */
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
    const noteOverlap = intersection.size / union.size;
    similarity += noteOverlap * 0.3;

    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Generate similarity matrix using AI analysis
   */
  async generateAISimilarityMatrix() {
    console.log('🧠 Generating AI-based similarity matrix...');
    console.log(`📊 Analyzing ${this.oils.length} oils - ${this.oils.length * (this.oils.length - 1) / 2} comparisons`);

    let completed = 0;
    const total = this.oils.length * (this.oils.length - 1) / 2;

    for (let i = 0; i < this.oils.length; i++) {
      for (let j = i + 1; j < this.oils.length; j++) {
        const oil1 = this.oils[i];
        const oil2 = this.oils[j];

        const similarity = await this.getLLMNoteSimilarity(oil1, oil2);

        this.similarities[`${oil1}-${oil2}`] = similarity;
        this.similarities[`${oil2}-${oil1}`] = similarity;

        completed++;
        const progress = Math.round((completed / total) * 100);
        console.log(`⚡ Progress: ${progress}% (${completed}/${total})`);
      }
    }

    // Self-similarity
    this.oils.forEach(oil => {
      this.similarities[`${oil}-${oil}`] = 1.0;
    });

    console.log('✅ AI similarity matrix completed!');
  }

  /**
   * Convert similarity matrix to 2D embeddings using MDS
   */
  generateEmbeddings() {
    console.log('📐 Converting similarities to 2D coordinates...');

    // Create distance matrix (1 - similarity)
    const n = this.oils.length;
    const distances = Array(n).fill().map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const oil1 = this.oils[i];
        const oil2 = this.oils[j];
        const similarity = this.similarities[`${oil1}-${oil2}`] || 0;
        distances[i][j] = 1 - similarity;
      }
    }

    // Simple MDS implementation
    const embeddings = this.simpleMDS(distances);

    // Create embeddings object
    this.oils.forEach((oil, index) => {
      this.embeddings[oil] = {
        x: embeddings[index][0],
        y: embeddings[index][1],
        category: essentialOils[oil].category,
        notes: essentialOils[oil].notes,
        intensity: essentialOils[oil].intensity,
        description: essentialOils[oil].description
      };
    });

    console.log('✅ 2D embeddings generated!');
  }

  /**
   * Simple Multidimensional Scaling (MDS) implementation
   */
  simpleMDS(distances) {
    const n = distances.length;

    // Center the distance matrix
    const centered = Array(n).fill().map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const d_sq = distances[i][j] * distances[i][j];
        const row_mean = distances[i].reduce((sum, val) => sum + val * val, 0) / n;
        const col_mean = distances.map(row => row[j] * row[j]).reduce((sum, val) => sum + val, 0) / n;
        const total_mean = distances.flat().map(val => val * val).reduce((sum, val) => sum + val, 0) / (n * n);

        centered[i][j] = -0.5 * (d_sq - row_mean - col_mean + total_mean);
      }
    }

    // Simple eigenvalue approximation for 2D
    const coords = Array(n).fill().map(() => [0, 0]);

    // Use random initialization and iterative improvement
    for (let i = 0; i < n; i++) {
      coords[i][0] = (Math.random() - 0.5) * 2;
      coords[i][1] = (Math.random() - 0.5) * 2;
    }

    // Simple stress minimization
    for (let iter = 0; iter < 100; iter++) {
      const forces = Array(n).fill().map(() => [0, 0]);

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = coords[i][0] - coords[j][0];
          const dy = coords[i][1] - coords[j][1];
          const current_dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
          const target_dist = distances[i][j];

          const force = (current_dist - target_dist) / current_dist * 0.1;

          forces[i][0] -= force * dx;
          forces[i][1] -= force * dy;
          forces[j][0] += force * dx;
          forces[j][1] += force * dy;
        }
      }

      // Apply forces
      for (let i = 0; i < n; i++) {
        coords[i][0] += forces[i][0];
        coords[i][1] += forces[i][1];
      }
    }

    return coords;
  }

  /**
   * Generate HTML visualization
   */
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
    <title>AI-Powered Essential Oils Note Clustering</title>
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
        .ai-badge {
            background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
            padding: 8px 16px;
            border-radius: 20px;
            display: inline-block;
            margin: 10px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 AI-Powered Scent Note Clustering</h1>
        <p class="subtitle">2D visualization using AI analysis of essential oil note characteristics and perfumery positions</p>
        <div class="ai-badge">🧠 Powered by AI Similarity Analysis</div>

        <div class="chart-container">
            <svg id="ai-notes-plot"></svg>
        </div>
    </div>

    <div class="tooltip" id="tooltip"></div>

    <script>
        const embeddings = ${JSON.stringify(this.embeddings, null, 2)};
        const categoryColors = ${JSON.stringify(categoryColors, null, 2)};

        // Set up SVG dimensions
        const margin = {top: 20, right: 20, bottom: 20, left: 20};
        const width = 800 - margin.left - margin.right;
        const height = 600 - margin.top - margin.bottom;

        const svg = d3.select("#ai-notes-plot")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        const g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Create scales
        const xExtent = d3.extent(Object.values(embeddings), d => d.x);
        const yExtent = d3.extent(Object.values(embeddings), d => d.y);

        const xScale = d3.scaleLinear()
            .domain([xExtent[0] - 0.1, xExtent[1] + 0.1])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([yExtent[0] - 0.1, yExtent[1] + 0.1])
            .range([height, 0]);

        // Create tooltip
        const tooltip = d3.select("#tooltip");

        // Draw points
        Object.entries(embeddings).forEach(([oilName, oilData]) => {
            g.append("circle")
                .attr("cx", xScale(oilData.x))
                .attr("cy", yScale(oilData.y))
                .attr("r", 8)
                .attr("fill", categoryColors[oilData.category])
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
    </script>
</body>
</html>`;
  }

  async generate() {
    console.log('🤖 Generating AI-powered notes clustering visualization...');

    try {
      // Step 1: Generate AI similarity matrix
      await this.generateAISimilarityMatrix();

      // Step 2: Convert to 2D embeddings
      this.generateEmbeddings();

      // Step 3: Generate HTML visualization
      const htmlContent = this.generateHTML();
      const htmlPath = path.join(__dirname, 'public', 'ai-notes-clustering.html');
      fs.writeFileSync(htmlPath, htmlContent);

      // Step 4: Save similarity data
      const dataPath = path.join(__dirname, 'public', 'ai-notes-data.json');
      fs.writeFileSync(dataPath, JSON.stringify({
        similarities: this.similarities,
        embeddings: this.embeddings,
        metadata: {
          totalOils: this.oils.length,
          totalComparisons: Object.keys(this.similarities).length / 2,
          generatedAt: new Date().toISOString(),
          method: 'AI-powered similarity analysis'
        }
      }, null, 2));

      console.log('✅ AI notes clustering visualization generated!');
      console.log(`📁 HTML: ${htmlPath}`);
      console.log(`📊 Data: ${dataPath}`);
      console.log('🌐 Open in browser: http://localhost:3000/ai-notes-clustering.html');

      return { htmlPath, dataPath };

    } catch (error) {
      console.error('❌ Failed to generate AI visualization:', error);
      throw error;
    }
  }
}

// Generate the AI-powered visualization
const generator = new AINotesVisualization();
generator.generate().catch(console.error);

module.exports = AINotesVisualization;
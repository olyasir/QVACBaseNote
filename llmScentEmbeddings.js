/**
 * LLM-Based Scent Embeddings Generator
 *
 * Uses the LLM to generate pairwise similarity scores between all essential oils,
 * then applies Multidimensional Scaling (MDS) to create 2D embeddings for visualization.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const essentialOils = require('./essentialOils');

class LLMScentEmbeddings {
  constructor() {
    this.oils = essentialOils;
    this.oilNames = Object.keys(this.oils);
    this.similarityMatrix = {};
    this.embeddings = {};
    this.categoryColors = {
      'citrus': '#FFA500',
      'floral': '#FF69B4',
      'herbal': '#90EE90',
      'woody': '#8B4513',
      'earthy': '#A0522D',
      'resinous': '#DAA520',
      'spice': '#DC143C'
    };
    this.cacheFile = path.join(__dirname, 'similarity_cache.json');
  }

  // Load cached similarities if they exist
  loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const cached = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
        this.similarityMatrix = cached.similarityMatrix || {};
        console.log(`Loaded ${Object.keys(this.similarityMatrix).length} cached similarity scores`);
        return true;
      }
    } catch (error) {
      console.warn('Failed to load cache:', error.message);
    }
    return false;
  }

  // Save similarities to cache
  saveCache() {
    try {
      const cache = {
        similarityMatrix: this.similarityMatrix,
        timestamp: new Date().toISOString(),
        oilCount: this.oilNames.length
      };
      fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2));
      console.log('Similarity cache saved');
    } catch (error) {
      console.warn('Failed to save cache:', error.message);
    }
  }

  // Generate similarity key for oil pair (consistent ordering)
  getSimilarityKey(oil1, oil2) {
    return [oil1, oil2].sort().join('|');
  }

  // Call LLM to get similarity between two oils
  async getSimilarityScore(oil1, oil2) {
    const key = this.getSimilarityKey(oil1, oil2);

    // Return cached score if available
    if (this.similarityMatrix[key]) {
      return this.similarityMatrix[key];
    }

    return new Promise((resolve, reject) => {
      console.log(`Getting LLM similarity: ${oil1} vs ${oil2}`);

      const bare = spawn('bare', ['scentSimilarityBare.js', oil1, oil2], {
        cwd: __dirname,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      bare.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      bare.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      bare.on('close', (code) => {
        if (code === 0) {
          try {
            // Extract JSON from output (LLM output includes other text)
            const jsonMatch = stdout.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              this.similarityMatrix[key] = {
                oil1: result.oil1,
                oil2: result.oil2,
                similarity: result.similarity,
                reasoning: result.reasoning,
                timestamp: result.timestamp
              };
              resolve(this.similarityMatrix[key]);
            } else {
              reject(new Error('No JSON found in LLM output'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse LLM output: ${error.message}`));
          }
        } else {
          reject(new Error(`LLM process failed with code ${code}: ${stderr}`));
        }
      });

      bare.on('error', (error) => {
        reject(new Error(`Failed to spawn LLM process: ${error.message}`));
      });
    });
  }

  // Generate similarity matrix for all oil pairs
  async generateSimilarityMatrix() {
    console.log(`Generating similarity matrix for ${this.oilNames.length} oils...`);

    this.loadCache();

    const totalPairs = (this.oilNames.length * (this.oilNames.length - 1)) / 2;
    let processedPairs = 0;

    for (let i = 0; i < this.oilNames.length; i++) {
      for (let j = i + 1; j < this.oilNames.length; j++) {
        const oil1 = this.oilNames[i];
        const oil2 = this.oilNames[j];

        try {
          await this.getSimilarityScore(oil1, oil2);
          processedPairs++;

          const progress = ((processedPairs / totalPairs) * 100).toFixed(1);
          console.log(`Progress: ${processedPairs}/${totalPairs} (${progress}%)`);

          // Save cache periodically
          if (processedPairs % 5 === 0) {
            this.saveCache();
          }

        } catch (error) {
          console.error(`Failed to get similarity for ${oil1}-${oil2}:`, error.message);

          // Use fallback similarity based on category matching
          const key = this.getSimilarityKey(oil1, oil2);
          const sameCategory = this.oils[oil1].category === this.oils[oil2].category;
          this.similarityMatrix[key] = {
            oil1,
            oil2,
            similarity: sameCategory ? 60 : 30, // Fallback scores
            reasoning: `Fallback score: ${sameCategory ? 'same category' : 'different categories'}`,
            timestamp: new Date().toISOString()
          };
        }
      }
    }

    this.saveCache();
    console.log('Similarity matrix generation completed!');
  }

  // Convert similarity matrix to distance matrix for MDS
  createDistanceMatrix() {
    const n = this.oilNames.length;
    const distances = Array(n).fill().map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          distances[i][j] = 0; // Distance to self is 0
        } else {
          const key = this.getSimilarityKey(this.oilNames[i], this.oilNames[j]);
          const similarity = this.similarityMatrix[key]?.similarity || 50;

          // Convert similarity (0-100) to distance (0-1)
          distances[i][j] = (100 - similarity) / 100;
        }
      }
    }

    return distances;
  }

  // Simple Classical MDS implementation
  performMDS(distances, dimensions = 2) {
    const n = distances.length;

    // Center the distance matrix
    const centeredDistances = this.centerDistanceMatrix(distances);

    // Get eigenvalues and eigenvectors (simplified SVD)
    const { eigenvalues, eigenvectors } = this.eigenDecomposition(centeredDistances);

    // Take top dimensions
    const coordinates = Array(n).fill().map(() => Array(dimensions).fill(0));

    for (let i = 0; i < n; i++) {
      for (let d = 0; d < dimensions; d++) {
        coordinates[i][d] = Math.sqrt(Math.abs(eigenvalues[d])) * eigenvectors[i][d];
      }
    }

    return coordinates;
  }

  // Center distance matrix for MDS
  centerDistanceMatrix(distances) {
    const n = distances.length;
    const centered = Array(n).fill().map(() => Array(n).fill(0));

    // Calculate row and column means
    const rowMeans = distances.map(row => row.reduce((sum, val) => sum + val, 0) / n);
    const colMeans = Array(n).fill(0);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        colMeans[j] += distances[i][j];
      }
      colMeans[j] /= n;
    }
    const grandMean = rowMeans.reduce((sum, val) => sum + val, 0) / n;

    // Center the matrix
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        centered[i][j] = distances[i][j] - rowMeans[i] - colMeans[j] + grandMean;
      }
    }

    return centered;
  }

  // Simplified eigendecomposition using power iteration
  eigenDecomposition(matrix) {
    const n = matrix.length;
    const maxEigen = 2; // We only need top 2 eigenvalues/eigenvectors

    const eigenvalues = [];
    const eigenvectors = [];

    let workingMatrix = matrix.map(row => [...row]); // Copy matrix

    for (let e = 0; e < maxEigen; e++) {
      // Power iteration to find dominant eigenvector
      let vector = Array(n).fill().map(() => Math.random() - 0.5);

      for (let iter = 0; iter < 100; iter++) {
        const newVector = this.matrixVectorMultiply(workingMatrix, vector);
        const norm = Math.sqrt(newVector.reduce((sum, val) => sum + val * val, 0));
        vector = newVector.map(val => val / norm);
      }

      // Calculate eigenvalue
      const matVec = this.matrixVectorMultiply(workingMatrix, vector);
      const eigenvalue = this.dotProduct(vector, matVec);

      eigenvalues.push(eigenvalue);
      eigenvectors.push(vector);

      // Deflate matrix for next iteration
      workingMatrix = this.deflateMatrix(workingMatrix, vector, eigenvalue);
    }

    // Transpose eigenvectors for easier access
    const eigenvectorMatrix = Array(n).fill().map((_, i) =>
      eigenvectors.map(vec => vec[i])
    );

    return {
      eigenvalues,
      eigenvectors: eigenvectorMatrix
    };
  }

  // Helper functions for matrix operations
  matrixVectorMultiply(matrix, vector) {
    return matrix.map(row => this.dotProduct(row, vector));
  }

  dotProduct(a, b) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  deflateMatrix(matrix, eigenvector, eigenvalue) {
    const n = matrix.length;
    const deflated = Array(n).fill().map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        deflated[i][j] = matrix[i][j] - eigenvalue * eigenvector[i] * eigenvector[j];
      }
    }

    return deflated;
  }

  // Generate 2D embeddings using MDS
  async generateEmbeddings() {
    await this.generateSimilarityMatrix();

    console.log('Converting similarities to distances...');
    const distances = this.createDistanceMatrix();

    console.log('Performing MDS dimensionality reduction...');
    const coordinates = this.performMDS(distances, 2);

    // Create embeddings object
    this.oilNames.forEach((name, i) => {
      this.embeddings[name] = {
        x: coordinates[i][0],
        y: coordinates[i][1],
        category: this.oils[name].category,
        notes: this.oils[name].notes,
        intensity: this.oils[name].intensity,
        description: this.oils[name].description
      };
    });

    console.log(`Generated 2D embeddings for ${this.oilNames.length} oils`);
    return this.embeddings;
  }

  // Generate visualization data
  async generateVisualizationData() {
    const embeddings = await this.generateEmbeddings();

    return {
      embeddings,
      categoryColors: this.categoryColors,
      similarityMatrix: this.similarityMatrix,
      metadata: {
        totalOils: this.oilNames.length,
        totalSimilarities: Object.keys(this.similarityMatrix).length,
        categories: [...new Set(Object.values(this.oils).map(oil => oil.category))],
        generatedAt: new Date().toISOString(),
        method: 'LLM + MDS'
      }
    };
  }

  // Generate HTML visualization
  async generateHTML() {
    const data = await this.generateVisualizationData();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LLM-Based Scent Embeddings</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 30px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5em;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-style: italic;
        }
        .method-badge {
            display: inline-block;
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            margin-left: 10px;
        }
        #chart {
            width: 100%;
            height: 600px;
            border: 2px solid #ddd;
            border-radius: 10px;
            background: white;
        }
        .legend {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 15px;
            margin: 20px 0;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 5px 10px;
            background: rgba(0,0,0,0.05);
            border-radius: 15px;
        }
        .legend-color {
            width: 15px;
            height: 15px;
            border-radius: 50%;
        }
        .tooltip {
            position: absolute;
            background: rgba(0,0,0,0.9);
            color: white;
            padding: 12px;
            border-radius: 8px;
            font-size: 12px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
            max-width: 250px;
            line-height: 1.4;
        }
        .stats {
            text-align: center;
            margin-top: 20px;
            color: #666;
            font-size: 14px;
        }
        .stats strong {
            color: #333;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🤖 LLM-Based Scent Embeddings</h1>
        <p class="subtitle">AI-generated similarity clustering using ${data.metadata.method}<span class="method-badge">LLM POWERED</span></p>

        <div class="legend">
            ${Object.entries(data.categoryColors).map(([category, color]) =>
                `<div class="legend-item">
                    <div class="legend-color" style="background-color: ${color}"></div>
                    <span>${category}</span>
                </div>`
            ).join('')}
        </div>

        <div id="chart"></div>

        <div class="stats">
            <p>
                <strong>${data.metadata.totalOils}</strong> essential oils •
                <strong>${data.metadata.totalSimilarities}</strong> LLM similarity comparisons •
                <strong>${data.metadata.categories.length}</strong> categories
            </p>
            <p style="font-size: 12px; margin-top: 10px;">
                Generated: ${new Date(data.metadata.generatedAt).toLocaleString()}
            </p>
        </div>
    </div>

    <div class="tooltip" id="tooltip"></div>

    <script>
        const data = ${JSON.stringify(data.embeddings)};
        const colors = ${JSON.stringify(data.categoryColors)};

        // Set up dimensions and margins
        const margin = {top: 20, right: 20, bottom: 20, left: 20};
        const width = 1140 - margin.left - margin.right;
        const height = 560 - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select("#chart")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        const g = svg.append("g")
            .attr("transform", \`translate(\${margin.left},\${margin.top})\`);

        // Extract coordinates
        const points = Object.entries(data).map(([name, point]) => ({
            name,
            x: point.x,
            y: point.y,
            category: point.category,
            notes: point.notes,
            intensity: point.intensity,
            description: point.description
        }));

        // Create scales
        const xExtent = d3.extent(points, d => d.x);
        const yExtent = d3.extent(points, d => d.y);

        // Add padding to extents
        const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
        const yPadding = (yExtent[1] - yExtent[0]) * 0.1;

        const xScale = d3.scaleLinear()
            .domain([xExtent[0] - xPadding, xExtent[1] + xPadding])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
            .range([height, 0]);

        // Create tooltip
        const tooltip = d3.select("#tooltip");

        // Add circles for each oil
        g.selectAll(".oil-point")
            .data(points)
            .enter()
            .append("circle")
            .attr("class", "oil-point")
            .attr("cx", d => xScale(d.x))
            .attr("cy", d => yScale(d.y))
            .attr("r", d => {
                const baseSize = 8;
                const sizeMap = { light: 0.8, medium: 1, strong: 1.2, heavy: 1.4 };
                return baseSize * (sizeMap[d.intensity] || 1);
            })
            .attr("fill", d => colors[d.category])
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .style("filter", "drop-shadow(2px 2px 4px rgba(0,0,0,0.2))")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", d => {
                        const baseSize = 8;
                        const sizeMap = { light: 0.8, medium: 1, strong: 1.2, heavy: 1.4 };
                        return (baseSize * (sizeMap[d.intensity] || 1)) + 4;
                    })
                    .attr("stroke-width", 3);

                tooltip
                    .style("opacity", 1)
                    .html(\`
                        <strong>\${d.name.charAt(0).toUpperCase() + d.name.slice(1)}</strong><br/>
                        <em>\${d.category} • \${d.intensity} intensity</em><br/>
                        <strong>Notes:</strong> \${d.notes.join(', ')}<br/>
                        <strong>Profile:</strong> \${d.description}
                    \`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", d => {
                        const baseSize = 8;
                        const sizeMap = { light: 0.8, medium: 1, strong: 1.2, heavy: 1.4 };
                        return baseSize * (sizeMap[d.intensity] || 1);
                    })
                    .attr("stroke-width", 2);

                tooltip.style("opacity", 0);
            });

        // Add labels for oils
        g.selectAll(".oil-label")
            .data(points)
            .enter()
            .append("text")
            .attr("class", "oil-label")
            .attr("x", d => xScale(d.x))
            .attr("y", d => yScale(d.y) - 18)
            .attr("text-anchor", "middle")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .style("fill", "#333")
            .style("pointer-events", "none")
            .style("text-shadow", "1px 1px 2px rgba(255,255,255,0.8)")
            .text(d => d.name.replace('-', ' '));
    </script>
</body>
</html>`;
  }
}

module.exports = LLMScentEmbeddings;
/**
 * Scent Embeddings Visualization
 *
 * Creates 2D scatter plot visualization of essential oils clustered by their scent notes.
 * Uses TF-IDF-like approach to create vector embeddings from scent descriptors,
 * then applies PCA for dimensionality reduction to 2D space.
 */

const essentialOils = require('./essentialOils');

class ScentEmbeddings {
  constructor() {
    this.oils = essentialOils;
    this.vocabulary = new Set();
    this.embeddings = {};
    this.reducedEmbeddings = {};
    this.categoryColors = {
      'citrus': '#FFA500',
      'floral': '#FF69B4',
      'herbal': '#90EE90',
      'woody': '#8B4513',
      'earthy': '#A0522D',
      'resinous': '#DAA520',
      'spice': '#DC143C'
    };
  }

  // Build vocabulary from all scent notes
  buildVocabulary() {
    for (const [oilName, oilData] of Object.entries(this.oils)) {
      oilData.notes.forEach(note => this.vocabulary.add(note));
    }
    this.vocabularyArray = Array.from(this.vocabulary);
    console.log(`Built vocabulary of ${this.vocabularyArray.length} unique notes`);
  }

  // Create TF-IDF style embeddings
  createEmbeddings() {
    // Calculate document frequency for each note
    const documentFreq = {};
    const totalDocuments = Object.keys(this.oils).length;

    this.vocabularyArray.forEach(note => {
      documentFreq[note] = 0;
      for (const [oilName, oilData] of Object.entries(this.oils)) {
        if (oilData.notes.includes(note)) {
          documentFreq[note]++;
        }
      }
    });

    // Create embeddings for each oil
    for (const [oilName, oilData] of Object.entries(this.oils)) {
      const embedding = new Array(this.vocabularyArray.length).fill(0);

      this.vocabularyArray.forEach((note, index) => {
        if (oilData.notes.includes(note)) {
          // TF-IDF: term frequency * inverse document frequency
          const tf = 1 / oilData.notes.length; // normalized term frequency
          const idf = Math.log(totalDocuments / documentFreq[note]);
          embedding[index] = tf * idf;
        }
      });

      this.embeddings[oilName] = embedding;
    }

    console.log(`Created ${Object.keys(this.embeddings).length} embeddings`);
  }

  // Simple PCA implementation for dimensionality reduction
  reduceToPCA() {
    const oilNames = Object.keys(this.embeddings);
    const embeddingMatrix = oilNames.map(name => this.embeddings[name]);

    // Center the data
    const means = this.calculateMeans(embeddingMatrix);
    const centeredMatrix = embeddingMatrix.map(row =>
      row.map((val, i) => val - means[i])
    );

    // Calculate covariance matrix
    const covMatrix = this.calculateCovariance(centeredMatrix);

    // Get top 2 eigenvectors (simplified - using approximation)
    const eigenVecs = this.getTopEigenvectors(covMatrix, 2);

    // Project data onto 2D space
    oilNames.forEach((name, i) => {
      const x = this.dotProduct(centeredMatrix[i], eigenVecs[0]);
      const y = this.dotProduct(centeredMatrix[i], eigenVecs[1]);

      this.reducedEmbeddings[name] = {
        x: x,
        y: y,
        category: this.oils[name].category,
        notes: this.oils[name].notes,
        intensity: this.oils[name].intensity
      };
    });

    console.log(`Reduced to 2D embeddings for ${oilNames.length} oils`);
  }

  // Mathematical helper functions
  calculateMeans(matrix) {
    const numCols = matrix[0].length;
    const means = new Array(numCols).fill(0);

    matrix.forEach(row => {
      row.forEach((val, i) => means[i] += val);
    });

    return means.map(sum => sum / matrix.length);
  }

  calculateCovariance(centeredMatrix) {
    const numFeatures = centeredMatrix[0].length;
    const numSamples = centeredMatrix.length;
    const covMatrix = Array(numFeatures).fill().map(() => Array(numFeatures).fill(0));

    for (let i = 0; i < numFeatures; i++) {
      for (let j = 0; j < numFeatures; j++) {
        let sum = 0;
        for (let k = 0; k < numSamples; k++) {
          sum += centeredMatrix[k][i] * centeredMatrix[k][j];
        }
        covMatrix[i][j] = sum / (numSamples - 1);
      }
    }

    return covMatrix;
  }

  // Simplified power iteration for top eigenvectors
  getTopEigenvectors(matrix, numVecs) {
    const size = matrix.length;
    const eigenvectors = [];

    for (let v = 0; v < numVecs; v++) {
      let vector = Array(size).fill().map(() => Math.random() - 0.5);

      // Power iteration
      for (let iter = 0; iter < 50; iter++) {
        vector = this.matrixVectorProduct(matrix, vector);
        vector = this.normalizeVector(vector);
      }

      eigenvectors.push(vector);

      // Deflate matrix for next eigenvector (simplified)
      if (v < numVecs - 1) {
        matrix = this.deflateMatrix(matrix, vector);
      }
    }

    return eigenvectors;
  }

  matrixVectorProduct(matrix, vector) {
    return matrix.map(row => this.dotProduct(row, vector));
  }

  dotProduct(a, b) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }

  normalizeVector(vector) {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
  }

  deflateMatrix(matrix, eigenvector) {
    const eigenvalue = this.dotProduct(
      this.matrixVectorProduct(matrix, eigenvector),
      eigenvector
    );

    return matrix.map((row, i) =>
      row.map((val, j) => val - eigenvalue * eigenvector[i] * eigenvector[j])
    );
  }

  // Generate visualization data
  generateVisualizationData() {
    this.buildVocabulary();
    this.createEmbeddings();
    this.reduceToPCA();

    return {
      embeddings: this.reducedEmbeddings,
      categoryColors: this.categoryColors,
      vocabulary: this.vocabularyArray,
      metadata: {
        totalOils: Object.keys(this.oils).length,
        totalNotes: this.vocabularyArray.length,
        categories: [...new Set(Object.values(this.oils).map(oil => oil.category))]
      }
    };
  }

  // Generate HTML visualization
  generateHTML() {
    const data = this.generateVisualizationData();

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scent Embeddings Visualization</title>
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
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s;
            max-width: 200px;
        }
        .stats {
            text-align: center;
            margin-top: 20px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌸 Scent Embeddings</h1>
        <p class="subtitle">Essential oils clustered by aromatic similarity</p>

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
            <p><strong>${data.metadata.totalOils}</strong> essential oils • <strong>${data.metadata.totalNotes}</strong> unique scent notes • <strong>${data.metadata.categories.length}</strong> categories</p>
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
            intensity: point.intensity
        }));

        // Create scales
        const xExtent = d3.extent(points, d => d.x);
        const yExtent = d3.extent(points, d => d.y);

        const xScale = d3.scaleLinear()
            .domain(xExtent)
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain(yExtent)
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
            .attr("r", d => d.intensity === 'light' ? 6 : d.intensity === 'medium' ? 8 : d.intensity === 'strong' ? 10 : 12)
            .attr("fill", d => colors[d.category])
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", d => (d.intensity === 'light' ? 6 : d.intensity === 'medium' ? 8 : d.intensity === 'strong' ? 10 : 12) + 3)
                    .attr("stroke-width", 3);

                tooltip
                    .style("opacity", 1)
                    .html(\`
                        <strong>\${d.name}</strong><br/>
                        <em>\${d.category}</em><br/>
                        Intensity: \${d.intensity}<br/>
                        Notes: \${d.notes.join(', ')}
                    \`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", d => d.intensity === 'light' ? 6 : d.intensity === 'medium' ? 8 : d.intensity === 'strong' ? 10 : 12)
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
            .attr("y", d => yScale(d.y) - 15)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("font-weight", "bold")
            .style("fill", "#333")
            .style("pointer-events", "none")
            .text(d => d.name);
    </script>
</body>
</html>`;
  }
}

module.exports = ScentEmbeddings;
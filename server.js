/**
 * Essential Oil Scent Blender Server
 *
 * A web server that provides an API for AI-powered essential oil blending.
 * Uses @tetherto/llm-llamacpp via Bare runtime for intelligent blend recommendations
 * following proper perfumery principles (top, middle, base notes).
 *
 * @author Claude Code
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

// ============================================================================
// MIDDLEWARE SETUP
// ============================================================================

app.use(cors());                    // Enable cross-origin requests
app.use(express.json());            // Parse JSON request bodies
app.use(express.static('public'));  // Serve static files from public/

// ============================================================================
// SCENT EMBEDDINGS VISUALIZATION
// ============================================================================

// API endpoint to get embeddings data
app.get('/api/embeddings/data', (req, res) => {
  try {
    const ScentEmbeddings = require('./scentEmbeddings');
    const scentViz = new ScentEmbeddings();
    const data = scentViz.generateVisualizationData();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API endpoint to get LLM embeddings data
app.get('/api/embeddings/llm-data', async (req, res) => {
  try {
    const LLMScentEmbeddings = require('./llmScentEmbeddings');
    const llmViz = new LLMScentEmbeddings();
    const data = await llmViz.generateVisualizationData();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// ESSENTIAL OILS DATABASE
// ============================================================================

const essentialOils = require('./essentialOils.js');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Cleans up tokenized text output from LLM streaming
 * Fixes common issues like broken words and spacing
 *
 * @param {string} text - Raw tokenized text from LLM
 * @returns {string} - Cleaned and properly formatted text
 */
function cleanTokenizedText(text) {
  let cleaned = text
    // Fix common broken words from tokenization
    .replace(/Frank\s*inc\s*ense/g, 'Frankincense')
    .replace(/Cedar\s*wood/g, 'Cedarwood')
    .replace(/RECOMMENDA\s*TION/g, 'RECOMMENDATION')
    .replace(/SC\s*ENT/g, 'SCENT')

    // Fix spacing around percentages and punctuation
    .replace(/(\d+)\s+%/g, '$1%')
    .replace(/:\s*(\d)/g, ': $1')
    .replace(/\s*-\s*/g, ' - ')

    // Clean up line breaks and excessive whitespace
    .replace(/\n\s*\n/g, '\n')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned;
}

/**
 * Creates a fallback blend when LLM is unavailable
 * Follows proper perfumery principles: 1 TOP, 1 MIDDLE, 1 BASE note
 *
 * @param {string[]} oils - Array of available oil names
 * @param {string} description - Target scent description
 * @returns {string} - Formatted blend recommendation
 */
function generateDemoBlend(oils, description) {
  // ========================================================================
  // OIL CATEGORIZATION BY PERFUMERY NOTES
  // ========================================================================

  // TOP NOTES: Fresh, light oils that evaporate quickly (citrus, fresh herbs)
  const topNotes = oils.filter(oil => {
    const oilData = essentialOils[oil.toLowerCase()];
    return oilData && (
      oilData.category === 'citrus' ||
      (oilData.category === 'herbal' && oilData.intensity === 'strong' && oilData.notes.includes('fresh'))
    );
  });

  // MIDDLE NOTES: Heart of the blend, lasting 2-4 hours (florals, resins, herbs)
  const middleNotes = oils.filter(oil => {
    const oilData = essentialOils[oil.toLowerCase()];
    return oilData && (
      oilData.category === 'floral' ||
      oilData.category === 'resinous' ||
      (oilData.category === 'herbal' && oilData.intensity === 'medium')
    );
  });

  // BASE NOTES: Foundation, lasting 6+ hours (woods, earth, heavy oils)
  const baseNotes = oils.filter(oil => {
    const oilData = essentialOils[oil.toLowerCase()];
    return oilData && (
      oilData.category === 'woody' ||
      oilData.category === 'earthy' ||
      oilData.intensity === 'heavy'
    );
  });

  // ========================================================================
  // SMART OIL SELECTION: EXACTLY 1 FROM EACH CATEGORY
  // ========================================================================

  let topOil = topNotes.length > 0 ? topNotes[0] : null;
  let middleOil = middleNotes.length > 0 ? middleNotes[0] : null;
  let baseOil = baseNotes.length > 0 ? baseNotes[0] : null;

  // Fill missing note types from remaining oils
  const used = [topOil, middleOil, baseOil].filter(Boolean);
  const remaining = oils.filter(oil => !used.includes(oil));

  if (!topOil && remaining.length > 0) topOil = remaining.shift();
  if (!middleOil && remaining.length > 0) middleOil = remaining.shift();
  if (!baseOil && remaining.length > 0) baseOil = remaining.shift();

  // ========================================================================
  // PROFESSIONAL BLEND CREATION
  // ========================================================================

  const selectedOils = [
    { oil: middleOil, note: 'MIDDLE', percentage: 50 },  // Heart of the blend
    { oil: baseOil, note: 'BASE', percentage: 30 },     // Foundation
    { oil: topOil, note: 'TOP', percentage: 20 }        // Opening impression
  ].filter(item => item.oil !== null);

  const noteReasons = {
    'TOP': 'Light opening note that provides initial impression',
    'MIDDLE': 'Heart of the blend providing main character',
    'BASE': 'Foundation note that grounds and anchors the blend'
  };

  const blendLines = selectedOils.map(({ oil, note, percentage }) =>
    `- ${oil}: ${percentage}% - ${note} note - ${noteReasons[note]}`
  ).join('\n');

  return `BLEND RECOMMENDATION:
${blendLines}

TOTAL: 100%

SCENT PROFILE: A professionally balanced 3-oil blend following perfumery principles with distinct top, middle, and base notes for "${description}".`;
}

/**
 * Calls the Bare runtime script to get LLM-powered blend recommendations
 * Handles streaming output and provides robust error handling
 *
 * @param {string[]} oils - Array of available oil names
 * @param {string} description - Target scent description
 * @returns {Promise<Object>} - Result object with success status and output
 */
function generateBlendWithBare(oils, description) {
  return new Promise((resolve) => {
    const oilsString = oils.join(',');

    // Spawn Bare runtime process
    const bare = spawn('bare', ['scentBlenderBare.js', oilsString, description], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // ======================================================================
    // OUTPUT PROCESSING FOR STREAMING LLM RESPONSES
    // ======================================================================

    let stdout = '';
    let stderr = '';
    let blendRecommendation = '';
    let inBlendSection = false;
    let foundBlend = false;
    let collectingTokens = false;

    bare.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;

      // Detect and collect streaming tokens from LLM
      if (chunk.includes('BLEND') || chunk.includes('RECOMMENDATION') || collectingTokens) {
        collectingTokens = true;
        foundBlend = true;

        // Stop collecting when we see completion markers
        if (chunk.includes('Inference stats:') || chunk.includes('SCRIPT_SUCCESSFUL') ||
           (chunk.includes('Job ') && chunk.includes('completed'))) {
          collectingTokens = false;
        } else {
          blendRecommendation += chunk;
        }
      }

      // Fallback line-based parsing
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.includes('BLEND RECOMMENDATION:')) {
          inBlendSection = true;
          foundBlend = true;
          if (!collectingTokens) {
            blendRecommendation += line + '\n';
          }
        } else if (inBlendSection && !collectingTokens) {
          if (line.includes('Inference stats:') || line.includes('SCRIPT_SUCCESSFUL') ||
             (line.includes('Job ') && line.includes('completed'))) {
            inBlendSection = false;
          } else if (line.trim().length > 0) {
            blendRecommendation += line + '\n';
          }
        }
      }
    });

    bare.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // ======================================================================
    // PROCESS COMPLETION HANDLING
    // ======================================================================

    bare.on('close', (code) => {
      if (code === 0 || foundBlend) {
        // Extract performance stats if available
        const statsMatch = stdout.match(/Inference stats: ({.+})/);
        const stats = statsMatch ? JSON.parse(statsMatch[1]) : null;

        let finalOutput = blendRecommendation.trim() || stdout;

        // Clean up tokenized text if needed
        if (finalOutput && collectingTokens) {
          finalOutput = cleanTokenizedText(finalOutput);
        }

        resolve({
          success: true,
          output: finalOutput,
          stats: stats
        });
      } else {
        console.error('Bare script failed with code:', code);
        console.error('stderr:', stderr);
        resolve({
          success: false,
          error: 'Failed to generate blend. Please ensure the LLM model is properly loaded.'
        });
      }
    });

    bare.on('error', (error) => {
      console.error('Failed to start bare script:', error);
      resolve({
        success: false,
        error: 'Failed to start LLM process'
      });
    });

    // Set timeout for long-running LLM processes
    setTimeout(() => {
      if (!bare.killed) {
        bare.kill('SIGTERM');
        resolve({
          success: false,
          error: 'Request timed out. The LLM model may be loading or processing. Please try again.'
        });
      }
    }, 600000); // 10 minute timeout
  });
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * POST /api/blend
 * Main endpoint for generating essential oil blend recommendations
 *
 * Request body:
 * {
 *   "oils": ["oil1", "oil2", "oil3"],     // Array of available oil names
 *   "description": "relaxing evening blend"  // Target scent description
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "recommendation": "BLEND RECOMMENDATION:...",
 *   "availableOils": ["oil1", "oil2", "oil3"],
 *   "targetDescription": "relaxing evening blend",
 *   "stats": {"TTFT": 123, "TPS": 4.5},
 *   "fallback": false  // true if demo mode was used
 * }
 */
app.post('/api/blend', async (req, res) => {
  try {
    const { oils, description } = req.body;

    // Input validation
    if (!oils || !Array.isArray(oils) || oils.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least one oil'
      });
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a scent description'
      });
    }

    // Filter valid oils using our database
    const validOils = oils.filter(oil => essentialOils[oil.toLowerCase()]);
    if (validOils.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid oils provided'
      });
    }

    console.log(`Generating blend for: ${validOils.join(', ')} - "${description}"`);

    // Try LLM first, fallback to demo if it fails
    const result = await generateBlendWithBare(validOils, description);

    if (result.success) {
      res.json({
        success: true,
        recommendation: result.output,
        availableOils: validOils,
        targetDescription: description,
        stats: result.stats
      });
    } else {
      // Fallback to intelligent demo mode
      console.log('LLM failed, using demo mode as fallback');
      const demoResult = generateDemoBlend(validOils, description);
      res.json({
        success: true,
        recommendation: demoResult,
        availableOils: validOils,
        targetDescription: description,
        stats: null,
        fallback: true
      });
    }

  } catch (error) {
    console.error('Error in /api/blend:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint for monitoring server status
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * GET /api/oils
 * Returns the complete essential oils database
 */
app.get('/api/oils', (req, res) => {
  res.json(essentialOils);
});

/**
 * GET /
 * Serves the main web UI
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================================
// ERROR HANDLING & SERVER STARTUP
// ============================================================================

// Global error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🌿 Scent Blender UI Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving UI from: ${path.join(__dirname, 'public')}`);
  console.log(`🤖 LLM backend: Bare + @tetherto/llm-llamacpp`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  / - Web UI`);
  console.log(`   POST /api/blend - Generate blend`);
  console.log(`   GET  /api/oils - Get oil database`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`\n🚀 Open your browser to http://localhost:${PORT} to start blending!`);
});
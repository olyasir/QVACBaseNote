/**
 * Persistent LLM Service for Scent Similarity
 *
 * Keeps the LLM loaded in memory and processes multiple similarity requests
 * without reloading the model each time. Dramatically improves performance.
 */

const Corestore = require('corestore');
const HyperDriveDL = require('@tetherto/qvac-lib-dl-hyperdrive');
const LlmLlamacpp = require('@tetherto/llm-llamacpp');
const essentialOils = require('./essentialOils');

class LLMService {
  constructor() {
    this.model = null;
    this.store = null;
    this.isLoaded = false;
    this.isLoading = false;
    this.queue = [];
  }

  async initialize() {
    if (this.isLoaded || this.isLoading) {
      return;
    }

    this.isLoading = true;
    console.log('🤖 Initializing persistent LLM service...');

    try {
      // Initialize store and model (same setup as scentBlenderBare.js)
      this.store = new Corestore('./store');

      const hdDL = new HyperDriveDL({
        key: 'hd://b11388de0e9214d8c2181eae30e31bcd49c48b26d621b353ddc7f01972dddd76',
        store: this.store
      });

      const args = {
        loader: hdDL,
        opts: { stats: true },
        logger: console,
        diskPath: './models/',
        modelName: 'medgemma-4b-it-Q4_1.gguf'
      };

      const config = {
        gpu_layers: '0',
        ctx_size: '1024',
        device: 'cpu',
        temp: '0.3',
        top_p: '0.9',
        top_k: '40',
        predict: '150'
      };

      this.model = new LlmLlamacpp(args, config);

      console.log('Loading model... (this may take a while)');
      await this.model.load(true, progress => {
        process.stdout.write(`\rProgress: ${progress.overallProgress}%`);
      });
      console.log('\n✅ LLM service ready!');

      this.isLoaded = true;
      this.isLoading = false;

      // Process any queued requests
      this.processQueue();

    } catch (error) {
      this.isLoading = false;
      console.error('❌ Failed to initialize LLM service:', error.message);
      throw error;
    }
  }

  async processQueue() {
    while (this.queue.length > 0 && this.isLoaded) {
      const { oil1, oil2, resolve, reject } = this.queue.shift();
      try {
        const result = await this._compareSimilarity(oil1, oil2);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  }

  async compareSimilarity(oil1, oil2) {
    if (!this.isLoaded) {
      if (!this.isLoading) {
        this.initialize();
      }

      // Queue the request if model is still loading
      return new Promise((resolve, reject) => {
        this.queue.push({ oil1, oil2, resolve, reject });
      });
    }

    return this._compareSimilarity(oil1, oil2);
  }

  async _compareSimilarity(oil1, oil2) {
    // Validate oils exist
    if (!essentialOils[oil1] || !essentialOils[oil2]) {
      throw new Error('One or both oils not found in database');
    }

    const oilData1 = essentialOils[oil1];
    const oilData2 = essentialOils[oil2];

    // Create comparison prompt
    const prompt = `You are an expert perfumer comparing essential oils. Rate the scent similarity between these two oils on a scale of 0-100, where:
- 0 = Completely different scent profiles
- 50 = Moderately similar (some shared characteristics)
- 100 = Nearly identical scent profiles

Oil 1 - ${oil1}:
- Category: ${oilData1.category}
- Intensity: ${oilData1.intensity}
- Notes: ${oilData1.notes.join(', ')}
- Description: ${oilData1.description}

Oil 2 - ${oil2}:
- Category: ${oilData2.category}
- Intensity: ${oilData2.intensity}
- Notes: ${oilData2.notes.join(', ')}
- Description: ${oilData2.description}

Consider scent notes, intensity, category, and overall aromatic character. Provide only the numerical score (0-100) followed by a brief explanation.

Similarity score:`;

    const messages = [{ role: 'user', content: prompt }];

    // Get LLM response
    const response_stream = await this.model.run(messages);
    const buffer = [];

    await response_stream
      .onUpdate(token => {
        buffer.push(token);
      })
      .await();

    const response = buffer.join('');

    // Extract numerical score from response
    const scoreMatch = response.match(/(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;
    const validScore = Math.max(0, Math.min(100, score));

    return {
      oil1,
      oil2,
      similarity: validScore,
      reasoning: response.trim(),
      timestamp: new Date().toISOString()
    };
  }

  async batchCompareSimilarity(pairs) {
    const results = [];

    for (const [oil1, oil2] of pairs) {
      try {
        console.log(`Comparing ${oil1} vs ${oil2}...`);
        const result = await this.compareSimilarity(oil1, oil2);
        results.push(result);
      } catch (error) {
        console.error(`Failed comparison ${oil1}-${oil2}:`, error.message);

        // Add fallback result
        const sameCategory = essentialOils[oil1]?.category === essentialOils[oil2]?.category;
        results.push({
          oil1,
          oil2,
          similarity: sameCategory ? 60 : 30,
          reasoning: `Fallback score: ${sameCategory ? 'same category' : 'different categories'}`,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  async shutdown() {
    if (this.store) {
      await this.store.close();
    }
    this.isLoaded = false;
    console.log('🤖 LLM service shut down');
  }
}

// Create singleton instance
const llmService = new LLMService();

module.exports = llmService;
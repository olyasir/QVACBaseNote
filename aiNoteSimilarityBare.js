/**
 * AI Note Similarity Calculator - Bare Runtime
 *
 * Analyzes perfumery note similarity between two essential oils using LLM
 *
 * Usage: bare aiNoteSimilarityBare.js oil1 oil2 oil1Data oil2Data
 */

'use strict'

const Corestore = require('corestore')
const HyperDriveDL = require('@tetherto/qvac-lib-dl-hyperdrive')
const LlmLlamacpp = require('@tetherto/llm-llamacpp')
const process = require('bare-process')

// Check arguments
if (process.argv.length < 6) {
  console.log('Usage: bare aiNoteSimilarityBare.js oil1 oil2 oil1Data oil2Data')
  process.exit(1)
}

const oil1 = process.argv[2]
const oil2 = process.argv[3]
const oil1Data = JSON.parse(process.argv[4])
const oil2Data = JSON.parse(process.argv[5])

async function main() {
  try {
    console.log(`🤖 Analyzing AI similarity: ${oil1} vs ${oil2}`)

    // Initialize LLM
    const store = new Corestore('./store')

    const hdDL = new HyperDriveDL({
      key: 'hd://b11388de0e9214d8c2181eae30e31bcd49c48b26d621b353ddc7f01972dddd76',
      store: store
    })

    const args = {
      loader: hdDL,
      opts: { stats: true },
      logger: {
        log: () => {},
        error: console.error,
        warn: () => {},
        info: () => {},
        debug: () => {}
      },
      diskPath: './models/',
      modelName: 'medgemma-4b-it-Q4_1.gguf'
    }

    const config = {
      gpu_layers: '0',
      ctx_size: '1024',
      device: 'cpu',
      temp: '0.3',
      top_p: '0.8',
      top_k: '20',
      predict: '50'  // Short response
    }

    const model = new LlmLlamacpp(args, config)

    console.log('⏳ Loading AI model...')
    await model.load(true)

    const messages = [
      {
        role: 'system',
        content: 'You are an expert perfumer analyzing essential oil note characteristics for similarity.'
      },
      {
        role: 'user',
        content: `Analyze perfumery note similarity between these oils:

OIL 1: ${oil1}
- Notes: ${oil1Data.notes.join(', ')}
- Intensity: ${oil1Data.intensity}
- Category: ${oil1Data.category}

OIL 2: ${oil2}
- Notes: ${oil2Data.notes.join(', ')}
- Intensity: ${oil2Data.intensity}
- Category: ${oil2Data.category}

Rate their similarity based on:
- Perfumery note position (TOP/MIDDLE/BASE)
- Evaporation rate and volatility
- Scent compatibility for blending

Respond with only a decimal number between 0.0 and 1.0:
- 1.0 = Very similar note positions
- 0.5 = Moderately compatible
- 0.0 = Very different positions

Number only:`
      }
    ]

    console.log('🧠 Analyzing similarity...')
    const response_stream = await model.run(messages)
    const buffer = []

    await response_stream
      .onUpdate(token => {
        buffer.push(token)
      })
      .await()

    const response = buffer.join('').trim()

    // Extract similarity score
    const match = response.match(/(\d*\.?\d+)/)
    const similarity = match ? Math.max(0, Math.min(1, parseFloat(match[1]))) : 0.5

    console.log(`✅ AI similarity score: ${similarity}`)
    console.log(`SIMILARITY_RESULT:${similarity}`)

    await store.close()
    process.exit(0)

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('SIMILARITY_RESULT:0.5')
    process.exit(1)
  }
}

main()
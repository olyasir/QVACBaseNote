/**
 * Essential Oil Scent Blender - LLM Backend
 *
 * Bare runtime script that uses @tetherto/llm-llamacpp for AI-powered
 * essential oil blend recommendations. This script is called by the web
 * server to generate professional perfumery blends.
 *
 * Usage: bare scentBlenderBare.js "oil1,oil2,oil3" "description"
 *
 * @author Claude Code
 * @version 1.0.0
 */

'use strict'

const Corestore = require('corestore')
const HyperDriveDL = require('@tetherto/qvac-lib-dl-hyperdrive')
const LlmLlamacpp = require('@tetherto/llm-llamacpp')
const process = require('bare-process')

// Essential oils data
const essentialOils = {
  "lavender": {
    notes: ["floral", "fresh", "calming", "sweet", "herbaceous"],
    intensity: "medium",
    category: "floral",
    description: "Classic calming floral with sweet undertones"
  },
  "bergamot": {
    notes: ["citrus", "fresh", "uplifting", "bright", "earl grey"],
    intensity: "light",
    category: "citrus",
    description: "Bright citrus with distinctive Earl Grey tea character"
  },
  "sandalwood": {
    notes: ["woody", "warm", "creamy", "sweet", "base"],
    intensity: "heavy",
    category: "woody",
    description: "Rich, creamy wood with lasting warmth"
  },
  "peppermint": {
    notes: ["minty", "cooling", "fresh", "invigorating", "sharp"],
    intensity: "strong",
    category: "herbal",
    description: "Intensely cooling and refreshing mint"
  },
  "ylang-ylang": {
    notes: ["floral", "exotic", "sweet", "tropical", "heady"],
    intensity: "heavy",
    category: "floral",
    description: "Intensely sweet tropical floral"
  },
  "eucalyptus": {
    notes: ["fresh", "medicinal", "cooling", "clean", "camphor"],
    intensity: "strong",
    category: "herbal",
    description: "Sharp, clean medicinal freshness"
  },
  "rose": {
    notes: ["floral", "romantic", "sweet", "classic", "feminine"],
    intensity: "medium",
    category: "floral",
    description: "Timeless romantic floral sweetness"
  },
  "cedarwood": {
    notes: ["woody", "dry", "warm", "grounding", "pencil shavings"],
    intensity: "medium",
    category: "woody",
    description: "Dry, warm wood with grounding qualities"
  },
  "lemon": {
    notes: ["citrus", "bright", "clean", "energizing", "zesty"],
    intensity: "light",
    category: "citrus",
    description: "Classic bright, energizing citrus"
  },
  "frankincense": {
    notes: ["resinous", "spiritual", "warm", "ancient", "meditative"],
    intensity: "medium",
    category: "resinous",
    description: "Sacred resin with deep, meditative warmth"
  }
}

class ScentBlender {
  constructor() {
    this.oils = essentialOils
    this.model = null
    this.store = null
  }

  async initialize() {
    console.log('Initializing QVAC system...')

    // Create corestore
    this.store = new Corestore('./store')

    // Create hyperdrive data loader with a model from the registry
    const hdDL = new HyperDriveDL({
      key: 'hd://b11388de0e9214d8c2181eae30e31bcd49c48b26d621b353ddc7f01972dddd76', // medgemma-4b model
      store: this.store
    })

    // Configure the model
    const args = {
      loader: hdDL,
      opts: { stats: true },
      logger: console,
      diskPath: './models/',
      modelName: 'medgemma-4b-it-Q4_1.gguf'
    }

    const config = {
      gpu_layers: '0', // Use CPU for compatibility
      ctx_size: '1024',
      device: 'cpu',
      temp: '0.7',
      top_p: '0.9',
      top_k: '40',
      predict: '300'
    }

    // Create and load model
    this.model = new LlmLlamacpp(args, config)

    console.log('Loading model... (this may take a while)')
    await this.model.load(true, progress => {
      process.stdout.write(`\rProgress: ${progress.overallProgress}%`)
    })
    console.log('\nModel loaded successfully!')
  }

  createPrompt(availableOils, targetDescription) {
    const oilsInfo = availableOils.map(oilName => {
      const oil = this.oils[oilName.toLowerCase()]
      if (!oil) return `${oilName}: Unknown oil`

      return `${oilName}: ${oil.description} (Notes: ${oil.notes.join(', ')}) [${oil.intensity} intensity, ${oil.category} category]`
    }).join('\n')

    return [
      {
        role: 'system',
        content: 'You are an expert perfumer. Create blends using EXACTLY 3 oils from the list. Classify each oil correctly:\n\nTOP NOTES (20%): Citrus oils (bergamot, lemon, orange, grapefruit) or fresh herbs (peppermint, eucalyptus)\nMIDDLE NOTES (50%): Floral oils (rose, lavender, jasmine, geranium, ylang-ylang), resinous oils (frankincense), or herbal oils (clary-sage, chamomile)\nBASE NOTES (30%): Woody oils (sandalwood, cedarwood), earthy oils (vetiver, patchouli), or heavy/intense oils\n\nSelect exactly ONE oil from each category. Never use two oils from the same note category.'
      },
      {
        role: 'user',
        content: `Available Essential Oils:
${oilsInfo}

Target Scent Description: "${targetDescription}"

IMPORTANT: Select EXACTLY 3 oils from the list above. Choose:
- 1 TOP note (citrus/light oils for initial impression)
- 1 MIDDLE note (floral/herbal for body)
- 1 BASE note (woody/resinous/earthy for foundation)

Format your response as:
BLEND RECOMMENDATION:
- [Oil Name]: [Percentage]% - [TOP/MIDDLE/BASE note] [Reason]
- [Oil Name]: [Percentage]% - [TOP/MIDDLE/BASE note] [Reason]
- [Oil Name]: [Percentage]% - [TOP/MIDDLE/BASE note] [Reason]

TOTAL: 100%

SCENT PROFILE: [Brief description of the resulting blend]`
      }
    ]
  }

  async blendScent(availableOils, targetDescription) {
    try {
      const messages = this.createPrompt(availableOils, targetDescription)
      console.log('\nGenerating blend recommendation...\n')

      const response = await this.model.run(messages)
      const buffer = []

      // Process the streaming response
      await response
        .onUpdate(token => {
          process.stdout.write(token)
          buffer.push(token)
        })
        .await()

      console.log('\n')

      return {
        success: true,
        recommendation: buffer.join(''),
        availableOils,
        targetDescription,
        stats: response.stats
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        availableOils,
        targetDescription
      }
    }
  }

  validateOils(oilNames) {
    const available = []
    const unavailable = []

    oilNames.forEach(name => {
      if (this.oils[name.toLowerCase()]) {
        available.push(name.toLowerCase())
      } else {
        unavailable.push(name)
      }
    })

    return { available, unavailable }
  }

  async cleanup() {
    if (this.model) {
      await this.model.unload()
    }
    if (this.store) {
      await this.store.close()
    }
  }
}

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.log('Usage: bare scentBlenderBare.js "oil1,oil2,oil3" "target scent description"')
    console.log('Example: bare scentBlenderBare.js "lavender,bergamot,sandalwood" "relaxing evening blend"')
    console.log('\nAvailable oils:')
    Object.keys(essentialOils).forEach(name => {
      console.log(`  ${name}: ${essentialOils[name].description}`)
    })
    return
  }

  const oilList = args[0].split(',').map(oil => oil.trim())
  const targetDescription = args[1]

  const blender = new ScentBlender()

  try {
    await blender.initialize()

    console.log('Validating oils...')
    const validation = blender.validateOils(oilList)

    if (validation.unavailable.length > 0) {
      console.log('Warning: Unknown oils will be ignored:', validation.unavailable.join(', '))
    }

    if (validation.available.length === 0) {
      console.log('Error: No valid oils provided')
      return
    }

    console.log('Using oils:', validation.available.join(', '))
    console.log('Target description:', targetDescription)

    const result = await blender.blendScent(validation.available, targetDescription)

    if (result.success) {
      console.log(`\nInference stats: ${JSON.stringify(result.stats)}`)
    } else {
      console.error('Error generating blend:', result.error)
    }

  } catch (error) {
    console.error('Fatal error:', error.message)
  } finally {
    await blender.cleanup()
    console.log('SCRIPT_SUCCESSFUL')
    process.kill(process.pid)
  }
}

main().catch(error => {
  console.error('Fatal error in main function:', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  })
  process.exit(1)
})
# 🌿 Essential Oil Scent Blender

An AI-powered web application for creating professional essential oil blends following proper perfumery principles. Uses `@tetherto/llm-llamacpp` for intelligent blend recommendations based on top, middle, and base notes.

## ✨ Features

- **🤖 AI-Powered Blending**: Uses advanced LLM for intelligent recommendations
- **🧪 Professional Perfumery**: Follows top/middle/base note structure
- **🌸 Rich Oil Database**: 20+ essential oils with detailed profiles
- **🎨 Beautiful Web UI**: Modern, responsive interface
- **⚡ Smart Fallback**: Intelligent demo mode when LLM is busy
- **📊 Performance Metrics**: Real-time inference statistics
- **🔄 Dual Backend**: LLM primary + rule-based fallback

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌──────────────────┐
│   Web Browser   │────│  Express Server │────│  Bare + LLM      │
│  (React-like UI)│    │   (Node.js)     │    │  (@tetherto)     │
└─────────────────┘    └─────────────────┘    └──────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │ Essential Oils  │
                        │   Database      │
                        └─────────────────┘
```

## 📋 Prerequisites

1. **Node.js** >= 18.x
2. **Bare Runtime** >= 1.17.3
3. **GitHub Personal Access Token** with `read:packages` scope

### Install Bare Runtime

```bash
npm install -g bare-runtime
```

Verify installation:
```bash
bare -v  # Should be >= 1.17.3
```

### Setup GitHub Token

Create a `.npmrc` file in the project root:
```ini
@tetherto:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN_HERE
```

## 🚀 Quick Start

1. **Clone/Download** the project
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the server**:
   ```bash
   node server.js
   ```
4. **Open browser** to: http://localhost:3000

## 💻 Usage

### Web Interface

1. **Select oils** by clicking the cards (they highlight green)
2. **Enter description** (e.g., "relaxing evening blend")
3. **Click "Create My Blend"** to get AI recommendations
4. **View results** with exact percentages and rationales

### API Usage

**POST** `/api/blend`
```json
{
  "oils": ["lavender", "bergamot", "sandalwood"],
  "description": "relaxing evening blend"
}
```

**Response:**
```json
{
  "success": true,
  "recommendation": "BLEND RECOMMENDATION:\n- lavender: 50% - MIDDLE note...",
  "availableOils": ["lavender", "bergamot", "sandalwood"],
  "targetDescription": "relaxing evening blend",
  "stats": {"TTFT": 23805.949, "TPS": 5.912},
  "fallback": false
}
```

### Command Line

```bash
# Direct LLM usage
bare scentBlenderBare.js "lavender,bergamot" "calming blend"

# Server with web UI
node server.js
```

## 🌿 Essential Oils Database

Our database includes 20+ oils with detailed profiles:

**Citrus** (TOP notes): Bergamot, Lemon, Orange, Grapefruit
**Floral** (MIDDLE notes): Lavender, Rose, Jasmine, Ylang-ylang
**Herbal** (TOP/MIDDLE): Peppermint, Eucalyptus, Clary Sage
**Woody** (BASE notes): Sandalwood, Cedarwood
**Earthy** (BASE notes): Vetiver, Patchouli
**Resinous** (MIDDLE notes): Frankincense

Each oil includes:
- Scent notes array
- Intensity level (light/medium/strong/heavy)
- Category classification
- Human-readable description

## 🎯 How It Works

### Perfumery Principles

The system follows traditional perfumery structure:

- **TOP NOTES (20%)**: First impression, evaporate in 15-120 minutes
- **MIDDLE NOTES (50%)**: Heart of blend, last 2-4 hours
- **BASE NOTES (30%)**: Foundation, lasting 6+ hours

### AI Processing

1. **Input Validation**: Filters oils against database
2. **LLM Processing**: Sends structured prompt to @tetherto/llm-llamacpp
3. **Smart Parsing**: Extracts blend data from streaming response
4. **Fallback Logic**: Uses rule-based system if LLM fails

### Intelligent Fallback

When LLM is unavailable:
- Categorizes oils by perfumery notes
- Selects exactly 1 TOP, 1 MIDDLE, 1 BASE
- Applies professional ratios
- Generates descriptive rationales

## 📁 Project Structure

```
scents/
├── server.js              # Express web server + API
├── scentBlenderBare.js     # Bare runtime LLM script
├── essentialOils.js        # Oil database
├── public/
│   └── index.html         # Web UI (single file app)
├── package.json           # Dependencies
├── .npmrc                 # GitHub registry config
└── README.md             # This file
```

## 🔧 API Endpoints

- **GET** `/` - Web UI
- **POST** `/api/blend` - Generate blend recommendation
- **GET** `/api/oils` - Get essential oils database
- **GET** `/api/health` - Server health check

## ⚙️ Configuration

### Server Settings

Edit `server.js` constants:
```javascript
const PORT = 3000;           // Server port
const TIMEOUT = 600000;      // LLM timeout (10 mins)
```

### LLM Settings

Edit `scentBlenderBare.js` config:
```javascript
const config = {
  gpu_layers: '0',          // GPU acceleration
  ctx_size: '1024',         // Context window
  device: 'cpu',            // cpu/gpu
  temp: '0.7',             // Creativity (0.1-2.0)
  top_p: '0.9',            // Nucleus sampling
  top_k: '40',             // Top-k sampling
  predict: '300'           // Max output tokens
}
```

## 🚨 Troubleshooting

### Common Issues

**"Module not found" error:**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**LLM timeout/fails:**
- First run downloads ~4GB model (takes time)
- Increase timeout in server.js
- Check Bare runtime version: `bare -v`

**GitHub token issues:**
- Verify token has `read:packages` scope
- Check `.npmrc` format
- Try: `npm login --scope=@tetherto --registry=https://npm.pkg.github.com`

**Port 3000 in use:**
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9
# Or change PORT in server.js
```

### Debug Mode

Add debug logging:
```javascript
// In server.js
console.log('Debug:', { oils, description, result });
```

## 🔮 Advanced Usage

### Custom Oil Database

Edit `essentialOils.js` to add oils:
```javascript
"my-oil": {
  notes: ["fresh", "green", "herbal"],
  intensity: "medium",
  category: "herbal",
  description: "Custom oil description"
}
```

### Multiple Model Support

The system can be extended to use different LLM models by modifying the Bare script's model loading configuration.

## 📊 Performance

**Typical Response Times:**
- Demo fallback: < 100ms
- LLM (first run): 30-60 seconds (model download)
- LLM (subsequent): 5-15 seconds
- Model size: ~2.4GB (Medgemma-4B-Q4_1)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes with proper comments
4. Test thoroughly
5. Submit pull request

## 📄 License

This project is open source. The LLM model (@tetherto/llm-llamacpp) has its own license terms.


**Built with ❤️ and QVAC** • **Happy Blending! 🌿✨**
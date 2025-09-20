/**
 * Essential Oils Database
 *
 * Comprehensive database of essential oils with detailed aromatherapy profiles.
 * Each oil includes scent notes, intensity, category, and description for
 * AI-powered blend creation following perfumery principles.
 *
 * Structure:
 * - notes: Array of scent descriptors
 * - intensity: light/medium/strong/heavy (evaporation rate)
 * - category: perfumery classification (citrus/floral/herbal/woody/earthy/resinous/spice)
 * - description: Human-readable scent profile
 */
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
  },
  "patchouli": {
    notes: ["earthy", "musky", "deep", "hippie", "rich"],
    intensity: "heavy",
    category: "earthy",
    description: "Deep, rich earth with musky undertones"
  },
  "tea-tree": {
    notes: ["medicinal", "fresh", "antiseptic", "clean", "sharp"],
    intensity: "medium",
    category: "herbal",
    description: "Clean, antiseptic freshness"
  },
  "jasmine": {
    notes: ["floral", "intoxicating", "sweet", "night-blooming", "exotic"],
    intensity: "heavy",
    category: "floral",
    description: "Intoxicatingly sweet night floral"
  },
  "orange": {
    notes: ["citrus", "sweet", "cheerful", "bright", "uplifting"],
    intensity: "light",
    category: "citrus",
    description: "Sweet, cheerful citrus brightness"
  },
  "vetiver": {
    notes: ["earthy", "grassy", "smoky", "sophisticated", "grounding"],
    intensity: "heavy",
    category: "earthy",
    description: "Sophisticated smoky grass with deep earth"
  },
  "geranium": {
    notes: ["floral", "rosy", "green", "balancing", "fresh"],
    intensity: "medium",
    category: "floral",
    description: "Rose-like floral with green freshness"
  },
  "clary-sage": {
    notes: ["herbal", "nutty", "sweet", "relaxing", "wine-like"],
    intensity: "medium",
    category: "herbal",
    description: "Sweet herbal with nutty, wine-like depth"
  },
  "grapefruit": {
    notes: ["citrus", "pink", "fresh", "energizing", "slightly bitter"],
    intensity: "light",
    category: "citrus",
    description: "Fresh pink citrus with subtle bitter edge"
  },
  "black-pepper": {
    notes: ["spicy", "warm", "sharp", "energizing", "masculine"],
    intensity: "strong",
    category: "spice",
    description: "Sharp, warming spice with energizing heat"
  },
  "chamomile": {
    notes: ["gentle", "apple-like", "soothing", "sweet", "calming"],
    intensity: "light",
    category: "floral",
    description: "Gentle apple-sweet calming floral"
  }
};

module.exports = essentialOils;
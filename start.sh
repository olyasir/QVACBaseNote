#!/bin/bash

echo "🌿 Essential Oil Scent Blender - Startup Script"
echo "=============================================="
echo ""
echo "🚀 Starting server on http://localhost:3000"
echo ""
echo "⚡ Performance Note:"
echo "   • First blend generation: 1-2 minutes (loads 2.38GB AI model)"
echo "   • Subsequent blends: Much faster (model stays cached)"
echo "   • The UI shows a timer so you can track loading progress"
echo ""
echo "💡 Tips for faster performance:"
echo "   • Keep the server running between requests"
echo "   • The AI model caches after first use"
echo "   • Select 3-5 oils for best results"
echo ""
echo "Starting server now..."
echo ""

node server.js
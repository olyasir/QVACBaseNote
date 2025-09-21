#!/bin/bash

echo "🎥 Screen + Audio Recording Script"
echo "=================================="
echo ""
echo "This will record your screen and microphone audio for the demo."
echo "Press Ctrl+C to stop recording."
echo ""
echo "Recording will be saved as: demo_recording.mp4"
echo ""
echo "Starting in 3 seconds..."
sleep 1
echo "2..."
sleep 1
echo "1..."
sleep 1
echo "🔴 RECORDING STARTED!"
echo ""

# Try Wayland-compatible recording first, fallback to X11
if [ "$XDG_SESSION_TYPE" = "wayland" ]; then
    echo "Detected Wayland - trying wf-recorder..."
    # Install wf-recorder if available: sudo apt install wf-recorder
    if command -v wf-recorder >/dev/null 2>&1; then
        wf-recorder -a -f demo_recording.mp4
    else
        echo "❌ wf-recorder not found. Please try Option 1 or 2 above."
        exit 1
    fi
else
    echo "Detected X11 - using ffmpeg..."
    # Record screen and microphone audio with ffmpeg for X11
    ffmpeg -video_size 1920x1200 -framerate 25 -f x11grab -i :0.0 \
           -f pulse -ac 2 -i default \
           -c:v libx264 -preset fast -crf 23 \
           -c:a aac -b:a 128k \
           demo_recording.mp4
fi

echo ""
echo "✅ Recording saved as: demo_recording.mp4"
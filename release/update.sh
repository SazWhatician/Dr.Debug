#!/usr/bin/env bash
echo "==================================================="
echo "🩺 Updating Dr. Debug Extension to Latest Release..."
echo "👨‍💻 Created by Saswat Mohanty (@SazWhatician)"
echo "🔗 https://github.com/SazWhatician"
echo "==================================================="
echo ""
echo "⬇️ Downloading latest extension package..."
curl -sL https://dr-debug.vercel.app/dr-debug-extension.zip -o dr-debug-update.zip
unzip -o -q dr-debug-update.zip
rm dr-debug-update.zip
echo ""
echo "✅ Successfully updated Dr. Debug to the latest version!"
echo "💡 In Chrome, navigate to chrome://extensions and click the 🔄 reload icon on Dr. Debug."
echo ""

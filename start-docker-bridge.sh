#!/usr/bin/env bash
echo "==================================================="
echo "🩺 Starting Dr. Debug Host Docker Bridge..."
echo "👨‍💻 Created by Saswat Mohanty (@SazWhatician)"
echo "🔗 https://github.com/SazWhatician"
echo "==================================================="
echo ""

if [ -f "packages/mcp/dist/cli.js" ]; then
  node packages/mcp/dist/cli.js
else
  npx -y @dr-debug/mcp
fi

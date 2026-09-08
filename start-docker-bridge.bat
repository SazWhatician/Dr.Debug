@echo off
echo ===================================================
echo 🩺 Starting Dr. Debug Host Docker Bridge...
echo 👨‍💻 Created by Saswat Mohanty (@SazWhatician)
echo 🔗 https://github.com/SazWhatician
echo ===================================================
echo.

if exist "packages\mcp\dist\cli.js" (
  node packages\mcp\dist\cli.js
) else (
  npx -y @dr-debug/mcp
)
pause

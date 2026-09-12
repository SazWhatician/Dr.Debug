@echo off
echo ===================================================
echo 🩺 Updating Dr. Debug Extension to Latest Release...
echo 👨‍💻 Created by Saswat Mohanty (@SazWhatician)
echo 🔗 https://github.com/SazWhatician
echo ===================================================
echo.
echo ⬇️ Downloading latest extension package...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://dr-debug.vercel.app/dr-debug-extension.zip' -OutFile 'dr-debug-update.zip'; Expand-Archive -Path 'dr-debug-update.zip' -DestinationPath '.' -Force; Remove-Item 'dr-debug-update.zip'"
echo.
echo ✅ Successfully updated Dr. Debug to the latest version!
echo 💡 In Chrome, navigate to chrome://extensions and click the 🔄 reload icon on Dr. Debug.
echo.
pause

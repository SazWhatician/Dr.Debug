Add-Type -AssemblyName System.Drawing

$srcPath = 'c:\Users\saswa\Desktop\DebugCopilot\landing\assets\drdebug.png'
if (-not (Test-Path $srcPath)) {
    $srcPath = 'c:\Users\saswa\Desktop\DebugCopilot\release\chrome-extension\icons\icon128.png'
}
if (-not (Test-Path $srcPath)) {
    $srcPath = 'c:\Users\saswa\Desktop\DebugCopilot\drdebug.png'
}

Write-Host "Using source logo: $srcPath"
$srcBytes = [System.IO.File]::ReadAllBytes($srcPath)
$srcMs = New-Object System.IO.MemoryStream(,$srcBytes)
$src = [System.Drawing.Image]::FromStream($srcMs)

function Resize-Image($image, $width, $height, $destPath) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.DrawImage($image, 0, 0, $width, $height)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    [System.IO.File]::WriteAllBytes($destPath, $ms.ToArray())
    $ms.Dispose()
    $bmp.Dispose()
}

# Ensure directories exist
$null = New-Item -ItemType Directory -Force -Path 'c:\Users\saswa\Desktop\DebugCopilot\packages\extension\public\icons'
$null = New-Item -ItemType Directory -Force -Path 'c:\Users\saswa\Desktop\DebugCopilot\packages\extension\icons'
$null = New-Item -ItemType Directory -Force -Path 'c:\Users\saswa\Desktop\DebugCopilot\packages\extension\dist\icons'
$null = New-Item -ItemType Directory -Force -Path 'c:\Users\saswa\Desktop\DebugCopilot\packages\ui\src\assets'

# Save resized icons
Resize-Image $src 128 128 'c:\Users\saswa\Desktop\DebugCopilot\packages\extension\public\icons\icon128.png'
Resize-Image $src 128 128 'c:\Users\saswa\Desktop\DebugCopilot\packages\extension\icons\icon128.png'
Resize-Image $src 128 128 'c:\Users\saswa\Desktop\DebugCopilot\packages\extension\dist\icons\icon128.png'

Resize-Image $src 48 48 'c:\Users\saswa\Desktop\DebugCopilot\packages\extension\public\icons\icon48.png'
Resize-Image $src 48 48 'c:\Users\saswa\Desktop\DebugCopilot\packages\extension\icons\icon48.png'
Resize-Image $src 48 48 'c:\Users\saswa\Desktop\DebugCopilot\packages\extension\dist\icons\icon48.png'

Resize-Image $src 32 32 'c:\Users\saswa\Desktop\DebugCopilot\packages\extension\public\icons\icon32.png'
Resize-Image $src 32 32 'c:\Users\saswa\Desktop\DebugCopilot\packages\extension\icons\icon32.png'
Resize-Image $src 32 32 'c:\Users\saswa\Desktop\DebugCopilot\packages\extension\dist\icons\icon32.png'

Resize-Image $src 16 16 'c:\Users\saswa\Desktop\DebugCopilot\packages\extension\public\icons\icon16.png'
Resize-Image $src 16 16 'c:\Users\saswa\Desktop\DebugCopilot\packages\extension\icons\icon16.png'
Resize-Image $src 16 16 'c:\Users\saswa\Desktop\DebugCopilot\packages\extension\dist\icons\icon16.png'

# Create 64x64 base64 data URI for TypeScript UI embedding
$bmp64 = New-Object System.Drawing.Bitmap(64, 64)
$g64 = [System.Drawing.Graphics]::FromImage($bmp64)
$g64.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g64.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g64.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g64.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g64.DrawImage($src, 0, 0, 64, 64)
$g64.Dispose()

$ms64 = New-Object System.IO.MemoryStream
$bmp64.Save($ms64, [System.Drawing.Imaging.ImageFormat]::Png)
$b64 = [Convert]::ToBase64String($ms64.ToArray())
$tsContent = "export const DR_DEBUG_LOGO = 'data:image/png;base64,$b64'`n"
[System.IO.File]::WriteAllText('c:\Users\saswa\Desktop\DebugCopilot\packages\ui\src\assets\logo.ts', $tsContent)

$ms64.Dispose()
$bmp64.Dispose()
$src.Dispose()
$srcMs.Dispose()

Write-Host "✅ Dr. Debug logo and icons generated successfully!"


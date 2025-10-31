# PowerShell script to patch Excalidraw's image size limit (Windows)
# This increases the 1440px limit to allow full-resolution images

Write-Host "🔧 Patching Excalidraw to remove 1440px image limit..." -ForegroundColor Cyan

$EXCALIDRAW_DIR = "node_modules\@excalidraw\excalidraw"

if (-not (Test-Path $EXCALIDRAW_DIR)) {
  Write-Host "❌ Excalidraw package not found. Run 'npm install' first." -ForegroundColor Red
  exit 1
}

$FOUND = $false

# Check production bundle
$PROD_FILE = "$EXCALIDRAW_DIR\dist\excalidraw.production.min.js"
if (Test-Path $PROD_FILE) {
  Write-Host "📝 Checking production bundle..."
  $content = Get-Content $PROD_FILE -Raw
  if ($content -match "1440") {
    Write-Host "✅ Found 1440 limit in production bundle" -ForegroundColor Green
    $content = $content -replace 'maxWidthOrHeight=1440', 'maxWidthOrHeight=10000'
    $content = $content -replace 'maxWidth:1440', 'maxWidth:10000'
    $content = $content -replace 'maxHeight:1440', 'maxHeight:10000'
    $content = $content -replace '=1440,', '=10000,'
    $content = $content -replace '=1440;', '=10000;'
    $content = $content -replace '=1440}', '=10000}'
    Set-Content $PROD_FILE $content
    $FOUND = $true
    Write-Host "✅ Patched production bundle" -ForegroundColor Green
  }
}

# Check development bundle
$DEV_FILE = "$EXCALIDRAW_DIR\dist\excalidraw.development.js"
if (Test-Path $DEV_FILE) {
  Write-Host "📝 Checking development bundle..."
  $content = Get-Content $DEV_FILE -Raw
  if ($content -match "1440") {
    Write-Host "✅ Found 1440 limit in development bundle" -ForegroundColor Green
    $content = $content -replace 'maxWidthOrHeight = 1440', 'maxWidthOrHeight = 10000'
    $content = $content -replace 'maxWidth: 1440', 'maxWidth: 10000'
    $content = $content -replace 'maxHeight: 1440', 'maxHeight: 10000'
    $content = $content -replace '= 1440,', '= 10000,'
    $content = $content -replace '= 1440;', '= 10000;'
    Set-Content $DEV_FILE $content
    $FOUND = $true
    Write-Host "✅ Patched development bundle" -ForegroundColor Green
  }
}

if ($FOUND) {
  Write-Host ""
  Write-Host "✅ Successfully patched Excalidraw!" -ForegroundColor Green
  Write-Host "🎯 Image size limit increased from 1440px to 10000px" -ForegroundColor Cyan
  Write-Host ""
  Write-Host "📦 Creating patch file with patch-package..." -ForegroundColor Cyan
  npx patch-package @excalidraw/excalidraw
  Write-Host ""
  Write-Host "✅ Patch file created! This will be automatically applied on 'npm install'" -ForegroundColor Green
  Write-Host ""
  Write-Host "🔄 Please refresh your browser to load the patched version" -ForegroundColor Yellow
} else {
  Write-Host ""
  Write-Host "⚠️  Could not find the 1440 limit in the expected locations" -ForegroundColor Yellow
  Write-Host "Please check the package structure manually"
}

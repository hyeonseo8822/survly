param(
    [string]$RenderUrl = "https://survly.mirim-it-show.site:3000"
)

Write-Host "Building survly frontend with VITE_API_BASE=$RenderUrl"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendUploads = Join-Path $repoRoot 'backend\uploads'
$frontendUploads = Join-Path $repoRoot 'survly\public\uploads'

if (!(Test-Path $frontendUploads)) {
    New-Item -ItemType Directory -Force -Path $frontendUploads | Out-Null
}

if (Test-Path $backendUploads) {
    Copy-Item -Path (Join-Path $backendUploads '*') -Destination $frontendUploads -Force -ErrorAction SilentlyContinue
}

# Ensure no trailing slash
$render = $RenderUrl.TrimEnd('/')
$env:VITE_API_BASE = $render

npm --prefix survly run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

npx gh-pages -d survly/dist
if ($LASTEXITCODE -ne 0) {
    Write-Error "gh-pages deploy failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Frontend built and deployed to gh-pages using VITE_API_BASE=$render"

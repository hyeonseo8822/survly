param(
    [string]$RenderUrl = "https://survly.onrender.com"
)

Write-Host "Building survly frontend with VITE_API_BASE=$RenderUrl"

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

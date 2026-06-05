$url='https://survly.mirim-it-show.site:3000/uploads/surveyImage-1779354349779-221801648.jpg'
try {
  $r = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing -TimeoutSec 15
  Write-Output $r.StatusCode
} catch {
  $e = $_.Exception
  if ($e -ne $null -and $e.Response -ne $null) {
    Write-Output $e.Response.StatusCode.value__
  } else {
    Write-Output 'ERROR'
  }
}

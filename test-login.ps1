$ErrorActionPreference = 'Continue'
$body = @{ email = 'seller@example.com'; password = 'Test1234!' } | ConvertTo-Json
try {
  $resp = Invoke-WebRequest -Uri 'http://localhost:3000/api/v1/auth/login' -Method POST -ContentType 'application/json' -Body $body -UseBasicParsing -TimeoutSec 10
  Write-Host "STATUS: $($resp.StatusCode)"
  Write-Host "BODY: $($resp.Content)"
} catch {
  Write-Host "STATUS: $($_.Exception.Response.StatusCode.value__)"
  $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
  Write-Host "BODY: $($reader.ReadToEnd())"
}
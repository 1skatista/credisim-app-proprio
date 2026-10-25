$ErrorActionPreference = 'Stop'
$credisimDirectory = $PSScriptRoot
$credisimNode = Get-Command node -ErrorAction SilentlyContinue
if (-not $credisimNode) { Write-Host 'Instale o Node.js 20 ou superior para iniciar o CrediSim.'; Read-Host 'Pressione Enter'; exit 1 }
$credisimReady = $false
try { $credisimHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:4173/health' -TimeoutSec 2; $credisimReady = $credisimHealth.app -eq 'credisim-local' } catch {}
if (-not $credisimReady) {
  $credisimProcess = Start-Process -FilePath $credisimNode.Source -ArgumentList ('"' + (Join-Path $credisimDirectory 'server.mjs') + '"') -WorkingDirectory $credisimDirectory -WindowStyle Hidden -PassThru
  Set-Content -LiteralPath (Join-Path $credisimDirectory '.server.pid') -Value $credisimProcess.Id
  for ($credisimAttempt = 0; $credisimAttempt -lt 20; $credisimAttempt++) {
    try { $credisimHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:4173/health' -TimeoutSec 1; if ($credisimHealth.app -eq 'credisim-local') { $credisimReady = $true; break } } catch {}
    Start-Sleep -Milliseconds 250
  }
}
if ($credisimReady) { Start-Process 'http://localhost:4173' } else { Write-Host 'Nao foi possivel iniciar. A porta 4173 pode estar ocupada. Consulte README.md.'; Read-Host 'Pressione Enter' }

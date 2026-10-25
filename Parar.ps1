$credisimPidFile = Join-Path $PSScriptRoot '.server.pid'
if (Test-Path -LiteralPath $credisimPidFile) {
  $credisimServerId = [int](Get-Content -LiteralPath $credisimPidFile)
  $credisimServer = Get-CimInstance Win32_Process -Filter "ProcessId=$credisimServerId" -ErrorAction SilentlyContinue
  $credisimExpected = Join-Path $PSScriptRoot 'server.mjs'
  if ($credisimServer -and $credisimServer.Name -eq 'node.exe' -and $credisimServer.CommandLine.Contains($credisimExpected)) { Stop-Process -Id $credisimServerId }
  Remove-Item -LiteralPath $credisimPidFile
}

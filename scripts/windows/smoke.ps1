$ErrorActionPreference = 'Stop'
$env:PIXEL_DESKTOP_HOME = Join-Path $env:TEMP ('aces-pixel-test-' + [guid]::NewGuid())
$env:PIXEL_DESKTOP_NO_BROWSER = '1'
$env:PIXEL_DESKTOP_PORT = '4349'
$p = Start-Process -FilePath '.\windows-build\ACES-Pixel.exe' -PassThru -RedirectStandardOutput 'windows-build\smoke.log' -RedirectStandardError 'windows-build\smoke-error.log'
try {
  $ready = $false
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    if ($p.HasExited) { throw 'EXE exited before startup' }
    try { $page = Invoke-WebRequest 'http://127.0.0.1:4349/'; if ($page.StatusCode -eq 200) { $ready = $true; break } } catch {}
  }
  if (-not $ready) { throw 'EXE startup timed out' }
  $token = Get-Content (Join-Path $env:PIXEL_DESKTOP_HOME 'data\owner-token.txt') -Raw
  Invoke-WebRequest 'http://127.0.0.1:4349/api/login' -Method Post -ContentType 'application/json' -Body (@{token=$token.Trim()} | ConvertTo-Json) -SessionVariable office | Out-Null
  $state = Invoke-RestMethod 'http://127.0.0.1:4349/api/state' -WebSession $office
  if ($state.demo -or $state.employees.Count -ne 7) { throw 'Unexpected office state' }
  $sprite = Invoke-WebRequest 'http://127.0.0.1:4349/assets/characters/ceo.png'
  if ($sprite.StatusCode -ne 200) { throw 'Embedded sprite missing' }
  Write-Host 'Windows EXE passed startup, sign-in, state and embedded sprite checks.'
} finally {
  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
  Remove-Item $env:PIXEL_DESKTOP_HOME -Recurse -Force -ErrorAction SilentlyContinue
}

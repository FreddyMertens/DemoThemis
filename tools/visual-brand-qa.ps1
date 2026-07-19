param(
  [string]$OutputDir = "C:\tmp\brand-cdp-qa",
  [string]$StaticOrigin = "http://127.0.0.1:4173",
  [string]$AppOrigin = "http://127.0.0.1:4180",
  [string[]]$PageFilter = @(),
  [int[]]$Widths = @(320, 375, 768, 1024, 1440),
  [switch]$RunVariants
)

$ErrorActionPreference = "Stop"
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path -LiteralPath $chrome)) {
  throw "Chrome was not found at $chrome"
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
$listener.Start()
$debugPort = ([System.Net.IPEndPoint]$listener.LocalEndpoint).Port
$listener.Stop()

$profile = Join-Path $OutputDir ("chrome-profile-" + [guid]::NewGuid().ToString("N"))
$chromeArgs = @(
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--remote-allow-origins=*",
  "--remote-debugging-port=$debugPort",
  "--user-data-dir=$profile",
  "about:blank"
)
$chromeProcess = Start-Process -FilePath $chrome -ArgumentList $chromeArgs -WindowStyle Hidden -PassThru

$socket = $null
$nextId = 0

function Send-CdpCommand {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [hashtable]$Params = @{}
  )

  $script:nextId += 1
  $id = $script:nextId
  $payload = @{ id = $id; method = $Method; params = $Params } | ConvertTo-Json -Depth 20 -Compress
  $payloadBytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
  $payloadSegment = [ArraySegment[byte]]::new($payloadBytes)
  $socket.SendAsync(
    $payloadSegment,
    [System.Net.WebSockets.WebSocketMessageType]::Text,
    $true,
    [System.Threading.CancellationToken]::None
  ).GetAwaiter().GetResult()

  while ($true) {
    $buffer = New-Object byte[] 4194304
    $stream = [System.IO.MemoryStream]::new()
    do {
      $segment = [ArraySegment[byte]]::new($buffer)
      $received = $socket.ReceiveAsync($segment, [System.Threading.CancellationToken]::None).GetAwaiter().GetResult()
      if ($received.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
        throw "Chrome DevTools connection closed while waiting for $Method"
      }
      $stream.Write($buffer, 0, $received.Count)
    } until ($received.EndOfMessage)
    $message = [System.Text.Encoding]::UTF8.GetString($stream.ToArray()) | ConvertFrom-Json
    $stream.Dispose()
    if ($message.id -eq $id) {
      if ($message.error) {
        throw "$Method failed: $($message.error.message)"
      }
      return $message.result
    }
  }
}

function Save-CdpScreenshot {
  param([Parameter(Mandatory = $true)][string]$Name)
  $capture = Send-CdpCommand -Method "Page.captureScreenshot" -Params @{
    format = "png"
    fromSurface = $true
    captureBeyondViewport = $false
  }
  $screenshotPath = Join-Path $OutputDir ("$Name.png")
  [System.IO.File]::WriteAllBytes($screenshotPath, [Convert]::FromBase64String($capture.data))
}

try {
  $targets = $null
  for ($attempt = 0; $attempt -lt 80 -and -not $targets; $attempt += 1) {
    try {
      $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$debugPort/json/list" -TimeoutSec 1
    } catch {
      Start-Sleep -Milliseconds 100
    }
  }
  if (-not $targets) { throw "Chrome DevTools endpoint did not start" }

  $target = $targets | Where-Object { $_.type -eq "page" } | Select-Object -First 1
  if (-not $target) { throw "Chrome did not expose a page target" }

  $socket = [System.Net.WebSockets.ClientWebSocket]::new()
  $socket.ConnectAsync([uri]$target.webSocketDebuggerUrl, [System.Threading.CancellationToken]::None).GetAwaiter().GetResult()
  Send-CdpCommand -Method "Page.enable" | Out-Null
  Send-CdpCommand -Method "Runtime.enable" | Out-Null
  Send-CdpCommand -Method "Emulation.setTouchEmulationEnabled" -Params @{ enabled = $true; maxTouchPoints = 5 } | Out-Null

  $pages = @(
    @{ Name = "home"; Url = "$StaticOrigin/index.html" },
    @{ Name = "demothemis"; Url = "$StaticOrigin/demothemis.html" },
    @{ Name = "break"; Url = "$StaticOrigin/break-the-court.html" },
    @{ Name = "omen"; Url = "$StaticOrigin/omenmarketmaker.html" },
    @{ Name = "bootstrap"; Url = "$StaticOrigin/bootstrap-loop.html" },
    @{ Name = "governance"; Url = "$StaticOrigin/governance.html" },
    @{ Name = "mvp"; Url = "$StaticOrigin/demothemis-mvp.html" },
    @{ Name = "live-app"; Url = "$AppOrigin/app" }
  )
  if ($PageFilter.Count -gt 0) {
    $pages = $pages | Where-Object { $PageFilter -contains $_.Name }
  }
  $report = @()

  foreach ($page in $pages) {
    foreach ($width in $Widths) {
      $mobile = $width -lt 768
      Send-CdpCommand -Method "Emulation.setDeviceMetricsOverride" -Params @{
        width = $width
        height = 1400
        deviceScaleFactor = 1
        mobile = $mobile
        screenWidth = $width
        screenHeight = 1400
      } | Out-Null
      Send-CdpCommand -Method "Emulation.setEmulatedMedia" -Params @{ media = "screen"; features = @() } | Out-Null
      Send-CdpCommand -Method "Page.navigate" -Params @{ url = $page.Url } | Out-Null
      Start-Sleep -Milliseconds 1800
      Send-CdpCommand -Method "Runtime.evaluate" -Params @{ expression = "window.scrollTo(0, 0)" } | Out-Null
      Send-CdpCommand -Method "Input.dispatchKeyEvent" -Params @{
        type = "keyDown"
        key = "Tab"
        code = "Tab"
        windowsVirtualKeyCode = 9
        nativeVirtualKeyCode = 9
      } | Out-Null
      Send-CdpCommand -Method "Input.dispatchKeyEvent" -Params @{
        type = "keyUp"
        key = "Tab"
        code = "Tab"
        windowsVirtualKeyCode = 9
        nativeVirtualKeyCode = 9
      } | Out-Null

      $auditExpression = @"
(() => {
  const root = document.documentElement;
  const body = document.body;
  const focusable = document.activeElement;
  const focusStyle = focusable && focusable !== body ? getComputedStyle(focusable) : null;
  return {
    title: document.title,
    innerWidth,
    clientWidth: root.clientWidth,
    scrollWidth: Math.max(root.scrollWidth, body ? body.scrollWidth : 0),
    overflowX: Math.max(root.scrollWidth, body ? body.scrollWidth : 0) - root.clientWidth,
    pageBrand: (body && body.getAttribute('data-page-brand')) || root.getAttribute('data-page-brand'),
    brandAssets: document.querySelectorAll('[src*="assets/brand"], [href*="assets/brand"]').length,
    focusVisible: !!focusStyle && (focusStyle.outlineStyle !== 'none' || focusStyle.boxShadow !== 'none')
  };
})()
"@
      $audit = Send-CdpCommand -Method "Runtime.evaluate" -Params @{ expression = $auditExpression; returnByValue = $true }
      $value = $audit.result.value
      $report += [pscustomobject]@{
        page = $page.Name
        width = $width
        innerWidth = $value.innerWidth
        clientWidth = $value.clientWidth
        scrollWidth = $value.scrollWidth
        overflowX = $value.overflowX
        pageBrand = $value.pageBrand
        brandAssets = $value.brandAssets
        focusVisible = $value.focusVisible
      }

      Save-CdpScreenshot -Name "$($page.Name)-$width"
    }
  }

  $reportPath = Join-Path $OutputDir "report.json"
  [System.IO.File]::WriteAllText($reportPath, ($report | ConvertTo-Json -Depth 5), [System.Text.Encoding]::UTF8)
  $report | Format-Table -AutoSize
  if ($report | Where-Object { $_.overflowX -gt 1 }) {
    throw "Responsive audit found horizontal overflow. See $reportPath"
  }

  if ($RunVariants) {
    $variants = @()
    Send-CdpCommand -Method "Emulation.setDeviceMetricsOverride" -Params @{
      width = 375; height = 1400; deviceScaleFactor = 1; mobile = $true; screenWidth = 375; screenHeight = 1400
    } | Out-Null

    Send-CdpCommand -Method "Emulation.setScriptExecutionDisabled" -Params @{ value = $false } | Out-Null
    Send-CdpCommand -Method "Emulation.setEmulatedMedia" -Params @{
      media = "screen"
      features = @(@{ name = "prefers-reduced-motion"; value = "reduce" })
    } | Out-Null
    Send-CdpCommand -Method "Page.navigate" -Params @{ url = "$StaticOrigin/omenmarketmaker.html" } | Out-Null
    Start-Sleep -Milliseconds 1200
    $reduced = Send-CdpCommand -Method "Runtime.evaluate" -Params @{
      expression = "({ reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, posterVisible: document.querySelector('[data-omen-rive] img').getBoundingClientRect().width > 0, riveStarted: document.querySelector('[data-omen-rive]').classList.contains('is-ready') })"
      returnByValue = $true
    }
    Save-CdpScreenshot -Name "omen-reduced-motion"
    $variants += [pscustomobject]@{ mode = "reduced-motion"; passed = $reduced.result.value.reduced -and $reduced.result.value.posterVisible -and -not $reduced.result.value.riveStarted }

    Send-CdpCommand -Method "Page.navigate" -Params @{ url = "$StaticOrigin/index.html" } | Out-Null
    Start-Sleep -Milliseconds 900
    $homeReduced = Send-CdpCommand -Method "Runtime.evaluate" -Params @{
      expression = "({ reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, posterVisible: document.querySelector('[data-omen-rive] img').getBoundingClientRect().width > 0, riveStarted: document.querySelector('[data-omen-rive]').classList.contains('is-ready') })"
      returnByValue = $true
    }
    Save-CdpScreenshot -Name "home-rive-reduced-motion"
    $variants += [pscustomobject]@{ mode = "home-reduced-motion"; passed = $homeReduced.result.value.reduced -and $homeReduced.result.value.posterVisible -and -not $homeReduced.result.value.riveStarted }

    Send-CdpCommand -Method "Emulation.setEmulatedMedia" -Params @{ media = "screen"; features = @() } | Out-Null
    Send-CdpCommand -Method "Network.enable" | Out-Null
    Send-CdpCommand -Method "Network.setBlockedURLs" -Params @{
      urls = @("*assets/vendor/rive/*", "*assets/brand/omenmarketmaker/wordmark.riv")
    } | Out-Null
    Send-CdpCommand -Method "Page.navigate" -Params @{ url = "$StaticOrigin/omenmarketmaker.html" } | Out-Null
    Start-Sleep -Milliseconds 900
    Save-CdpScreenshot -Name "omen-rive-blocked"
    $blocked = Send-CdpCommand -Method "Runtime.evaluate" -Params @{
      expression = "({ posterVisible: document.querySelector('[data-omen-rive] img').getBoundingClientRect().width > 0, riveStarted: document.querySelector('[data-omen-rive]').classList.contains('is-ready') })"
      returnByValue = $true
    }
    $variants += [pscustomobject]@{ mode = "rive-blocked-poster"; passed = $blocked.result.value.posterVisible -and -not $blocked.result.value.riveStarted }

    Send-CdpCommand -Method "Page.navigate" -Params @{ url = "$StaticOrigin/index.html" } | Out-Null
    Start-Sleep -Milliseconds 900
    $homeBlocked = Send-CdpCommand -Method "Runtime.evaluate" -Params @{
      expression = "({ posterVisible: document.querySelector('[data-omen-rive] img').getBoundingClientRect().width > 0, riveStarted: document.querySelector('[data-omen-rive]').classList.contains('is-ready') })"
      returnByValue = $true
    }
    Save-CdpScreenshot -Name "home-rive-blocked"
    $variants += [pscustomobject]@{ mode = "home-rive-blocked-poster"; passed = $homeBlocked.result.value.posterVisible -and -not $homeBlocked.result.value.riveStarted }
    Send-CdpCommand -Method "Network.setBlockedURLs" -Params @{ urls = @() } | Out-Null

    Send-CdpCommand -Method "Emulation.setDeviceMetricsOverride" -Params @{
      width = 1024; height = 1400; deviceScaleFactor = 1; mobile = $false; screenWidth = 1024; screenHeight = 1400
    } | Out-Null
    Send-CdpCommand -Method "Emulation.setEmulatedMedia" -Params @{
      media = "screen"
      features = @(@{ name = "forced-colors"; value = "active" })
    } | Out-Null
    Send-CdpCommand -Method "Page.navigate" -Params @{ url = "$StaticOrigin/governance.html" } | Out-Null
    Start-Sleep -Milliseconds 900
    $forced = Send-CdpCommand -Method "Runtime.evaluate" -Params @{
      expression = "({ forced: matchMedia('(forced-colors: active)').matches, ownershipLabels: document.querySelectorAll('[data-brand]').length, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth })"
      returnByValue = $true
    }
    Save-CdpScreenshot -Name "governance-forced-colors"
    $variants += [pscustomobject]@{ mode = "forced-colors"; passed = $forced.result.value.forced -and $forced.result.value.ownershipLabels -gt 0 -and $forced.result.value.overflowX -le 1 }

    Send-CdpCommand -Method "Emulation.setEmulatedMedia" -Params @{ media = "print"; features = @() } | Out-Null
    Send-CdpCommand -Method "Page.navigate" -Params @{ url = "$StaticOrigin/bootstrap-loop.html" } | Out-Null
    Start-Sleep -Milliseconds 900
    $print = Send-CdpCommand -Method "Runtime.evaluate" -Params @{
      expression = "({ print: matchMedia('print').matches, ownershipLabels: document.querySelectorAll('[data-brand]').length })"
      returnByValue = $true
    }
    Save-CdpScreenshot -Name "bootstrap-print"
    $variants += [pscustomobject]@{ mode = "print"; passed = $print.result.value.print -and $print.result.value.ownershipLabels -gt 0 }

    Send-CdpCommand -Method "Emulation.setEmulatedMedia" -Params @{ media = "screen"; features = @() } | Out-Null
    Send-CdpCommand -Method "Emulation.setDeviceMetricsOverride" -Params @{
      width = 720; height = 700; deviceScaleFactor = 2; mobile = $false; screenWidth = 1440; screenHeight = 1400
    } | Out-Null
    Send-CdpCommand -Method "Page.navigate" -Params @{ url = "$StaticOrigin/index.html" } | Out-Null
    Start-Sleep -Milliseconds 900
    $zoom = Send-CdpCommand -Method "Runtime.evaluate" -Params @{
      expression = "({ innerWidth, overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth })"
      returnByValue = $true
    }
    Save-CdpScreenshot -Name "home-200-percent-equivalent"
    $variants += [pscustomobject]@{ mode = "200-percent-equivalent"; passed = $zoom.result.value.innerWidth -eq 720 -and $zoom.result.value.overflowX -le 1 }

    $variantPath = Join-Path $OutputDir "variant-report.json"
    [System.IO.File]::WriteAllText($variantPath, ($variants | ConvertTo-Json -Depth 5), [System.Text.Encoding]::UTF8)
    $variants | Format-Table -AutoSize
    if ($variants | Where-Object { -not $_.passed }) {
      throw "Accessibility variant audit failed. See $variantPath"
    }
  }
} finally {
  if ($socket) {
    try { $socket.CloseAsync([System.Net.WebSockets.WebSocketCloseStatus]::NormalClosure, "done", [System.Threading.CancellationToken]::None).GetAwaiter().GetResult() } catch {}
    $socket.Dispose()
  }
  if ($chromeProcess -and -not $chromeProcess.HasExited) {
    Stop-Process -Id $chromeProcess.Id -Force
  }
}

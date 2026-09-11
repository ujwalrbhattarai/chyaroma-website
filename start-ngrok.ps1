$ErrorActionPreference = 'Stop'

$ngrokDomain = 'breeder-carbon-identify.ngrok-free.dev'
$ngrokAuthtoken = '3CcIHPIS6agCreHyucmXNFuwV4u_G9p5jA4cjifJDVxBhSp8'
$frontendPort = 5173
$backendPort = 3000

function Start-DetachedProcess {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$FilePath,
    [string[]]$ArgumentList
  )

  $process = Start-Process -FilePath $FilePath -WorkingDirectory $WorkingDirectory -ArgumentList $ArgumentList -PassThru
  Write-Host "$Name started in $WorkingDirectory (PID $($process.Id))"
  return $process
}

function Wait-ForPort {
  param(
    [int]$Port,
    [int]$TimeoutSeconds = 120
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $client = [System.Net.Sockets.TcpClient]::new()
      $asyncResult = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
      if ($asyncResult.AsyncWaitHandle.WaitOne(500)) {
        $client.EndConnect($asyncResult)
        $client.Close()
        return
      }
      $client.Close()
    } catch {
    }

    Start-Sleep -Milliseconds 500
  }

  throw "Timed out waiting for 127.0.0.1:$Port to become available. Check the frontend terminal for a startup error."
}

Set-Location $PSScriptRoot

Start-DetachedProcess -Name 'Backend' -WorkingDirectory (Join-Path $PSScriptRoot 'backend') -FilePath 'npm.cmd' -ArgumentList @('run', 'dev')
Start-DetachedProcess -Name 'Frontend' -WorkingDirectory (Join-Path $PSScriptRoot 'frontend') -FilePath 'npm.cmd' -ArgumentList @('run', 'dev', '--', '--host', '0.0.0.0', '--port', $frontendPort)

Wait-ForPort -Port $backendPort
Wait-ForPort -Port $frontendPort

& .\ngrok.exe config add-authtoken $ngrokAuthtoken | Out-Null
Write-Host "Opening ngrok tunnel for https://$ngrokDomain -> http://127.0.0.1:$frontendPort"
& .\ngrok.exe http --domain=$ngrokDomain $frontendPort

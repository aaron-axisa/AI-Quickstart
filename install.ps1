# AI-Quickstart — installer shim (forwards to bin/install.js).
#
# irm https://raw.githubusercontent.com/aaron-axisa/AI-Quickstart/main/install.ps1 | iex
# irm .../install.ps1 | iex -- --path C:\path\to\repo
#
# If execution policy blocks npx.ps1 (common with nvm-windows):
#   Set-ExecutionPolicy -Scope Process Bypass
#   irm https://raw.githubusercontent.com/aaron-axisa/AI-Quickstart/main/install.ps1 | iex
# Do NOT wrap in powershell -Command "..." — that breaks interactive prompts (no TTY).
# Or: npx.cmd -y github:aaron-axisa/AI-Quickstart

$ErrorActionPreference = "Stop"
$Repo = "aaron-axisa/AI-Quickstart"

function Test-NodeVersion {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error @"
ai-quickstart: Node.js (>=18) required. Install:
  winget install OpenJS.NodeJS.LTS
"@
  }
  $major = [int](node -p "process.versions.node.split('.')[0]")
  if ($major -lt 18) {
    Write-Error "ai-quickstart: Node $major too old. Need Node >=18."
  }
}

function Get-NpxCmdPath {
  $cmd = Get-Command npx.cmd -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($node) {
    $candidate = Join-Path (Split-Path $node.Source -Parent) "npx.cmd"
    if (Test-Path -LiteralPath $candidate) { return $candidate }
  }
  return $null
}

function Invoke-Npx {
  param([string[]]$NpxArgs)
  $npxCmd = Get-NpxCmdPath
  if ($npxCmd) {
    & $npxCmd @NpxArgs
    return $LASTEXITCODE
  }
  if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Error "ai-quickstart: npx required (ships with Node >=18)."
  }
  # Last resort: cmd.exe so PowerShell does not load unsigned npx.ps1 (nvm-windows).
  $argLine = ($NpxArgs | ForEach-Object {
    if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '""') + '"' } else { $_ }
  }) -join ' '
  cmd /d /s /c "npx $argLine"
  return $LASTEXITCODE
}

Test-NodeVersion

# When piped via `irm ... | iex`, MyCommand.Path is empty — use npx path below.
$scriptPath = $MyInvocation.MyCommand.Path
if (-not [string]::IsNullOrWhiteSpace($scriptPath)) {
  $localInstaller = Join-Path (Split-Path -Parent $scriptPath) "bin\install.js"
  if (Test-Path -LiteralPath $localInstaller) {
    node $localInstaller @args
    exit $LASTEXITCODE
  }
}

$npxArgs = @('-y', "github:$Repo")
if ($args.Count -gt 0) { $npxArgs += $args }

Write-Host "AI-Quickstart: starting installer (npx may take a moment on first run)..." -ForegroundColor Cyan
exit (Invoke-Npx $npxArgs)

# AI-Quickstart — installer shim (forwards to bin/install.js).
#
# irm https://raw.githubusercontent.com/aaron-axisa/AI-Quickstart/main/install.ps1 | iex
# irm .../install.ps1 | iex -- --path C:\path\to\repo

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

Test-NodeVersion

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$localInstaller = Join-Path $here "bin\install.js"
if (Test-Path $localInstaller) {
  node $localInstaller @args
  exit $LASTEXITCODE
}

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Error "ai-quickstart: npx required (ships with Node >=18)."
}

npx -y "github:$Repo" @args
exit $LASTEXITCODE

#!/usr/bin/env pwsh

$ErrorActionPreference = "Stop"

function Resolve-NodeExe {
  $localNodeExe = Join-Path $PSScriptRoot "node.exe"
  if (Test-Path $localNodeExe) {
    return $localNodeExe
  }

  $localNode = Join-Path $PSScriptRoot "node"
  if (Test-Path $localNode) {
    return $localNode
  }

  return "node"
}

function Resolve-NpmCli {
  param(
    [string]$NodeExe
  )

  $localNpmCli = Join-Path $PSScriptRoot "node_modules/npm/bin/npm-cli.js"
  if (Test-Path $localNpmCli) {
    return $localNpmCli
  }

  $localPrefixJs = Join-Path $PSScriptRoot "node_modules/npm/bin/npm-prefix.js"
  if (Test-Path $localPrefixJs) {
    $prefix = & $NodeExe $localPrefixJs
    if ($LASTEXITCODE -eq 0 -and $prefix) {
      $prefixedCli = Join-Path $prefix "node_modules/npm/bin/npm-cli.js"
      if (Test-Path $prefixedCli) {
        return $prefixedCli
      }
    }
  }

  $globalNpmCmd = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
  if ($globalNpmCmd) {
    return $null
  }

  throw "Unable to locate npm CLI. Ensure Node.js/npm is installed."
}

try {
  $nodeExe = Resolve-NodeExe
  $npmCli = Resolve-NpmCli -NodeExe $nodeExe
  $globalNpmCmd = Get-Command "npm.cmd" -ErrorAction SilentlyContinue

  if ($globalNpmCmd -and -not $npmCli) {
    if ($MyInvocation.ExpectingInput) {
      $input | & $globalNpmCmd.Source @args
    } else {
      & $globalNpmCmd.Source @args
    }
    exit $LASTEXITCODE
  }

  if ($MyInvocation.ExpectingInput) {
    $input | & $nodeExe $npmCli @args
  } else {
    & $nodeExe $npmCli @args
  }
  exit $LASTEXITCODE
} catch {
  Write-Host $_.Exception.Message
  exit 1
}

# DSH LAN access setup (requires Administrator)
#
# Does two things:
#   1. Switches the active network profile from Public to Private
#      (the plugin's firewall rule only applies to private,domain profiles)
#   2. Adds a TCP inbound allow rule for the DSH web port
#
# Usage: right-click this file -> "Run with PowerShell",
#        or from an elevated shell:
#        pwsh -ExecutionPolicy Bypass -File .\enable-dsh-lan.ps1

$ErrorActionPreference = 'Stop'

function Test-AdminRights {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-AdminRights)) {
    Write-Host "Administrator rights required, requesting elevation..." -ForegroundColor Yellow
    Start-Process pwsh -Verb RunAs -ArgumentList @(
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath
    )
    exit
}

Write-Host ""
Write-Host "=== [1/2] Set network profile to Private ===" -ForegroundColor Cyan
$netProfiles = Get-NetConnectionProfile | Where-Object { $_.IPv4Connectivity -eq 'Internet' }
foreach ($profile in $netProfiles) {
    if ($profile.NetworkCategory -ne 'Private') {
        try {
            Set-NetConnectionProfile -InterfaceIndex $profile.InterfaceIndex -NetworkCategory Private
            Write-Host "  [OK] $($profile.Name) ($($profile.InterfaceAlias)) -> Private" -ForegroundColor Green
        } catch {
            Write-Host "  [FAIL] $($profile.Name): $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "  [SKIP] $($profile.Name) already Private" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "=== [2/2] Allow the DSH web port ===" -ForegroundColor Cyan

$hostProcessIds = @(Get-CimInstance Win32_Process -Filter "Name='DeepSeek Harness.exe'" |
    Where-Object { $_.CommandLine -match 'dsh-desktop-host' } |
    Select-Object -ExpandProperty ProcessId)

$webPorts = @()
if ($hostProcessIds.Count -gt 0) {
    $webPorts = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
        Where-Object { $hostProcessIds -contains $_.OwningProcess } |
        Select-Object -ExpandProperty LocalPort -Unique)
}

if ($webPorts.Count -eq 0) {
    Write-Host "  [WARN] no DSH listening port found, skipping firewall rule" -ForegroundColor Yellow
} else {
    Write-Host ("  found port(s): " + ($webPorts -join ', ')) -ForegroundColor DarkGray
    foreach ($webPort in $webPorts) {
        $ruleName = "DSH remote-web-ui TCP " + $webPort
        $deleteArgs = @('advfirewall', 'firewall', 'delete', 'rule', "name=$ruleName")
        Start-Process -FilePath 'netsh' -ArgumentList $deleteArgs -Wait -WindowStyle Hidden -ErrorAction SilentlyContinue

        $addArgs = @(
            'advfirewall', 'firewall', 'add', 'rule', "name=$ruleName",
            'dir=in', 'action=allow', 'protocol=TCP', "localport=$webPort",
            'profile=private,domain'
        )
        $addProcess = Start-Process -FilePath 'netsh' -ArgumentList $addArgs -Wait -PassThru -WindowStyle Hidden

        if ($addProcess.ExitCode -eq 0) {
            Write-Host ("  [OK] allowed TCP " + $webPort + " (private,domain)") -ForegroundColor Green
        } else {
            Write-Host ("  [FAIL] TCP " + $webPort + " : netsh exit " + $addProcess.ExitCode) -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host "Next: in DSH go to Settings -> Web Plugins -> Remote Access and turn on LAN access."
Write-Host ""

$wlanIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias 'WLAN' -ErrorAction SilentlyContinue |
    Select-Object -First 1).IPAddress
if ($wlanIp -and $webPorts.Count -gt 0) {
    Write-Host "From a phone on the same Wi-Fi:" -ForegroundColor Green
    foreach ($webPort in $webPorts) {
        Write-Host ("  http://" + $wlanIp + ":" + $webPort) -ForegroundColor Green
    }
}

Write-Host ""
Read-Host "Press Enter to exit"

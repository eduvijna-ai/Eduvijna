# Idempotent inbound firewall rule for EduVijna Metro on TCP 8082.
# Scope: Domain + Private profiles, LocalSubnet only (no Public / internet exposure).
# Run elevated PowerShell if Access Denied:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\ensure-metro-firewall-8082.ps1

[CmdletBinding()]
param(
  [int]$Port = 8082,
  [string]$DisplayName = 'EduVijna Metro Dev 8082 (Private LAN)'
)

$ErrorActionPreference = 'Stop'

$existing = Get-NetFirewallRule -DisplayName $DisplayName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "PASS: firewall rule already present: $DisplayName"
  $existing | Format-Table DisplayName, Enabled, Direction, Action, Profile -AutoSize
  Get-NetFirewallPortFilter -AssociatedNetFirewallRule $existing | Format-Table Protocol, LocalPort -AutoSize
  Get-NetFirewallAddressFilter -AssociatedNetFirewallRule $existing | Format-Table RemoteAddress -AutoSize
  exit 0
}

try {
  New-NetFirewallRule `
    -DisplayName $DisplayName `
    -Direction Inbound `
    -Action Allow `
    -Protocol TCP `
    -LocalPort $Port `
    -Profile Domain, Private `
    -RemoteAddress LocalSubnet `
    -Description 'Allow LAN devices to reach EduVijna Expo/Metro during local development. Domain+Private only; LocalSubnet only.' | Out-Null
  Write-Host "PASS: created firewall rule: $DisplayName (TCP $Port, Domain+Private, LocalSubnet)"
  exit 0
} catch {
  Write-Host "BLOCKED: could not create firewall rule (elevation required?): $($_.Exception.Message)"
  Write-Host "Re-run this script from an elevated PowerShell window."
  exit 1
}

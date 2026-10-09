$ErrorActionPreference = 'Stop'
$project = Join-Path $PSScriptRoot '../../desktop/Edon.Desktop/Edon.Desktop.csproj'
$output = Join-Path $PSScriptRoot '../../artifacts/windows'
& (Join-Path $PSScriptRoot 'make-icon.ps1')
dotnet publish $project -c Release -r win-x64 --self-contained true -o $output
if ($LASTEXITCODE -ne 0) { throw 'Native publish failed.' }
Copy-Item -LiteralPath (Join-Path $output 'Edon.exe') -Destination (Join-Path $output 'Edon-0.2.0-win-x64.exe') -Force
$exe = Get-Item -LiteralPath (Join-Path $output 'Edon-0.2.0-win-x64.exe')
$hash = (Get-FileHash -LiteralPath $exe.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
[ordered]@{version='0.2.0'; platform='Windows x64'; bytes=$exe.Length; sha256=$hash; selfContained=$true; signed=$false} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $output 'release.json')
Write-Output "Built $($exe.FullName) ($($exe.Length) bytes)"

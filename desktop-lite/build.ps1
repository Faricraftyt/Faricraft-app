$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
dotnet build -c Release --nologo
if ($LASTEXITCODE -ne 0) { throw 'No se pudo compilar la aplicación.' }
New-Item -ItemType Directory -Force payload, prerequisites, release | Out-Null
$out = Join-Path $PSScriptRoot 'bin/Release/net48'
$package = Join-Path $env:USERPROFILE '.nuget/packages/microsoft.web.webview2/1.0.4314.35'
foreach ($name in @('Faricraft APP.exe', 'Faricraft APP.exe.config', 'Microsoft.Web.WebView2.Core.dll', 'Microsoft.Web.WebView2.WinForms.dll')) { Copy-Item (Join-Path $out $name) payload -Force }
Copy-Item "$package/runtimes/win-x64/native/WebView2Loader.dll" payload -Force
Copy-Item "$package/LICENSE.txt" payload/WebView2-LICENSE.txt -Force
Copy-Item "$package/NOTICE.txt" payload/WebView2-NOTICE.txt -Force
Invoke-WebRequest 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile prerequisites/MicrosoftEdgeWebview2Setup.exe
$signature = Get-AuthenticodeSignature prerequisites/MicrosoftEdgeWebview2Setup.exe
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'Microsoft Corporation') { throw 'No se pudo verificar el instalador de Microsoft.' }
$makensis = Join-Path ${env:ProgramFiles(x86)} 'NSIS/makensis.exe'
& $makensis installer.nsi
if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar el instalador.' }

Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "WinVer.nsh"
Name "Faricraft APP"
OutFile "release/Faricraft-APP-Setup-1.2.1-Ligero.exe"
InstallDir "$LOCALAPPDATA\Programs\Faricraft APP Lite"
InstallDirRegKey HKCU "Software\FaricraftAPPWebView2" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
VIProductVersion "1.2.1.0"
VIAddVersionKey /LANG=1034 "ProductName" "Faricraft APP"
VIAddVersionKey /LANG=1034 "FileDescription" "Instalador de Faricraft APP"
VIAddVersionKey /LANG=1034 "FileVersion" "1.2.1"
VIAddVersionKey /LANG=1034 "LegalCopyright" "Faricraft"
!define MUI_ICON "assets/icon.ico"
!define MUI_UNICON "assets/icon.ico"
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TEXT "Este asistente instalará Faricraft APP.$\r$\n$\r$\nLa aplicación necesita internet y usa Microsoft Edge WebView2. Si falta ese componente, se descargará de Microsoft durante la instalación.$\r$\n$\r$\nSi instalaste la versión 1.0.0, desinstalala desde Configuración de Windows para recuperar el espacio que ocupa."
!define MUI_FINISHPAGE_RUN "$INSTDIR\Faricraft APP.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir Faricraft APP"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH
!insertmacro MUI_LANGUAGE "Spanish"
Var RuntimePresent

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "Esta versión requiere Windows de 64 bits."
    Abort
  ${EndIf}
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_ICONSTOP "Esta versión requiere Windows 10 u 11."
    Abort
  ${EndIf}
  SetRegView 64
  ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" "Release"
  ${If} $0 < 528040
    MessageBox MB_ICONSTOP ".NET Framework 4.8 es necesario. Instalalo desde Microsoft y volvé a ejecutar este instalador. Windows 11 ya lo incluye."
    Abort
  ${EndIf}
FunctionEnd

Function CheckRuntime
  StrCpy $RuntimePresent 0
  SetRegView 32
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${If} $0 != ""
  ${AndIf} $0 != "0.0.0.0"
    StrCpy $RuntimePresent 1
  ${EndIf}
  SetRegView 64
  ReadRegStr $0 HKCU "SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${If} $0 != ""
  ${AndIf} $0 != "0.0.0.0"
    StrCpy $RuntimePresent 1
  ${EndIf}
FunctionEnd

Section "Faricraft APP (obligatorio)" MainSection
  SectionIn RO
  SetShellVarContext current
  SetRegView 64
  Call CheckRuntime
  ${If} $RuntimePresent == 0
    InitPluginsDir
    SetOutPath "$PLUGINSDIR"
    File "prerequisites/MicrosoftEdgeWebview2Setup.exe"
    DetailPrint "Instalando Microsoft Edge WebView2…"
    ExecWait '"$PLUGINSDIR\MicrosoftEdgeWebview2Setup.exe" /silent /install' $1
    Call CheckRuntime
    ${If} $RuntimePresent == 0
      MessageBox MB_ICONSTOP "No se pudo instalar WebView2. Revisá tu conexión y volvé a ejecutar el instalador."
      Abort
    ${EndIf}
  ${EndIf}
close_app:
  FindWindow $0 "" "Faricraft APP"
  ${If} $0 != 0
    MessageBox MB_RETRYCANCEL "Cerrá Faricraft APP antes de continuar." IDRETRY close_app
    Abort
  ${EndIf}
  SetOutPath "$INSTDIR"
  File "payload/Faricraft APP.exe"
  File "payload/Faricraft APP.exe.config"
  File "payload/Microsoft.Web.WebView2.Core.dll"
  File "payload/Microsoft.Web.WebView2.WinForms.dll"
  File "payload/WebView2Loader.dll"
  File "payload/WebView2-LICENSE.txt"
  File "payload/WebView2-NOTICE.txt"
  WriteUninstaller "$INSTDIR\Desinstalar.exe"
  CreateDirectory "$SMPROGRAMS\Faricraft APP"
  CreateShortcut "$SMPROGRAMS\Faricraft APP\Faricraft APP.lnk" "$INSTDIR\Faricraft APP.exe"
  CreateShortcut "$SMPROGRAMS\Faricraft APP\Desinstalar.lnk" "$INSTDIR\Desinstalar.exe"
  WriteRegStr HKCU "Software\FaricraftAPPWebView2" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FaricraftAPPWebView2" "DisplayName" "Faricraft APP (WebView2)"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FaricraftAPPWebView2" "DisplayVersion" "1.2.1"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FaricraftAPPWebView2" "Publisher" "Faricraft"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FaricraftAPPWebView2" "DisplayIcon" "$INSTDIR\Faricraft APP.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FaricraftAPPWebView2" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FaricraftAPPWebView2" "UninstallString" '$\"$INSTDIR\Desinstalar.exe$\"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FaricraftAPPWebView2" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FaricraftAPPWebView2" "NoRepair" 1
SectionEnd

Section "Acceso directo en el escritorio"
  CreateShortcut "$DESKTOP\Faricraft APP.lnk" "$INSTDIR\Faricraft APP.exe"
SectionEnd

Section "Uninstall"
  SetShellVarContext current
  SetRegView 64
un_close_app:
  FindWindow $0 "" "Faricraft APP"
  ${If} $0 != 0
    MessageBox MB_RETRYCANCEL "Cerrá Faricraft APP antes de desinstalarla." IDRETRY un_close_app
    Abort
  ${EndIf}
  Delete "$INSTDIR\Faricraft APP.exe"
  Delete "$INSTDIR\Faricraft APP.exe.config"
  Delete "$INSTDIR\Microsoft.Web.WebView2.Core.dll"
  Delete "$INSTDIR\Microsoft.Web.WebView2.WinForms.dll"
  Delete "$INSTDIR\WebView2Loader.dll"
  Delete "$INSTDIR\WebView2-LICENSE.txt"
  Delete "$INSTDIR\WebView2-NOTICE.txt"
  Delete "$INSTDIR\Desinstalar.exe"
  RMDir "$INSTDIR"
  Delete "$DESKTOP\Faricraft APP.lnk"
  Delete "$SMPROGRAMS\Faricraft APP\Faricraft APP.lnk"
  Delete "$SMPROGRAMS\Faricraft APP\Desinstalar.lnk"
  RMDir "$SMPROGRAMS\Faricraft APP"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\FaricraftAPPWebView2"
  DeleteRegKey HKCU "Software\FaricraftAPPWebView2"
SectionEnd

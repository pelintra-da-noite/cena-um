; Cena Um — páginas personalizadas do instalador
; Ao abrir, o instalador vê se o Cena Um já está no computador e mostra o botão certo:
;   não instalado → "Instalar"   ·   versão antiga → "Atualizar"
;   mesma versão  → "Reparar"    ·   versão mais recente → "Instalar esta versão"

!include nsDialogs.nsh
!include WordFunc.nsh

!ifndef BUILD_UNINSTALLER
  Var CenaVersaoInstalada
  Var CenaTitulo
  Var CenaSubtitulo
  Var CenaTexto
  Var CenaBotao
!endif

; Instala sempre só para o utilizador atual (sem pedir permissões de administrador
; e sem a pergunta "para quem é a instalação?", que confunde quem só quer escrever)
!macro customInstallMode
  StrCpy $isForceCurrentInstall "1"
!macroend

; A função fica dentro da macro para ser compilada depois de as páginas (MUI) estarem carregadas
!macro customWelcomePage
  Page custom CenaBoasVindas

  ; Escolha da pasta: só numa instalação nova. Ao atualizar ou reparar, usa a pasta onde já está.
  !define MUI_PAGE_CUSTOMFUNCTION_PRE CenaPastaPre
  !define MUI_PAGE_CUSTOMFUNCTION_SHOW CenaPastaMostrar
  !define MUI_DIRECTORYPAGE_TEXT_TOP "O Cena Um vai ser instalado na pasta abaixo. Para escolher outra, carrega em Procurar."
  !insertmacro MUI_PAGE_DIRECTORY

Function CenaPastaPre
  ${If} $CenaVersaoInstalada != ""
    Abort
  ${EndIf}
FunctionEnd

Function CenaPastaMostrar
  GetDlgItem $0 $HWNDPARENT 1
  SendMessage $0 ${WM_SETTEXT} 0 "STR:Instalar"
FunctionEnd

Function CenaBoasVindas
  ReadRegStr $CenaVersaoInstalada HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayVersion"
  ${If} $CenaVersaoInstalada == ""
    ReadRegStr $CenaVersaoInstalada HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "DisplayVersion"
  ${EndIf}

  ${If} $CenaVersaoInstalada == ""
    StrCpy $CenaTitulo "Instalar o Cena Um ${VERSION}"
    StrCpy $CenaSubtitulo "Escrita de guiões para cinema, televisão e teatro."
    StrCpy $CenaTexto "Este assistente vai instalar o Cena Um no teu computador.$\r$\n$\r$\nNo fim, encontras o programa no menu Iniciar e no ambiente de trabalho."
    StrCpy $CenaBotao "Seguinte"
  ${Else}
    ${VersionCompare} "$CenaVersaoInstalada" "${VERSION}" $R0
    ${If} $R0 == "0"
      StrCpy $CenaTitulo "Reparar o Cena Um ${VERSION}"
      StrCpy $CenaSubtitulo "Esta versão já está instalada neste computador."
      StrCpy $CenaTexto "Se o programa não abre ou não funciona como devia, Reparar volta a instalar os ficheiros do Cena Um.$\r$\n$\r$\nOs teus guiões (.cena) não são tocados: ficam onde os guardaste."
      StrCpy $CenaBotao "Reparar"
    ${ElseIf} $R0 == "2"
      StrCpy $CenaTitulo "Atualizar o Cena Um"
      StrCpy $CenaSubtitulo "Da versão $CenaVersaoInstalada para a versão ${VERSION}."
      StrCpy $CenaTexto "Tens o Cena Um $CenaVersaoInstalada instalado. Este instalador atualiza-o para a versão ${VERSION}.$\r$\n$\r$\nOs teus guiões (.cena) e as tuas definições não são tocados.$\r$\n$\r$\nSe o Cena Um estiver aberto, guarda o trabalho e fecha-o antes de continuar."
      StrCpy $CenaBotao "Atualizar"
    ${Else}
      StrCpy $CenaTitulo "Instalar uma versão mais antiga"
      StrCpy $CenaSubtitulo "Tens a versão $CenaVersaoInstalada; este instalador é da ${VERSION}."
      StrCpy $CenaTexto "O Cena Um que tens instalado ($CenaVersaoInstalada) é mais recente do que este instalador.$\r$\n$\r$\nSe continuares, voltas à versão ${VERSION}. Os teus guiões não são tocados."
      StrCpy $CenaBotao "Instalar"
    ${EndIf}
  ${EndIf}

  !insertmacro MUI_HEADER_TEXT "$CenaTitulo" "$CenaSubtitulo"
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 100% "$CenaTexto"
  Pop $1

  GetDlgItem $2 $HWNDPARENT 1
  SendMessage $2 ${WM_SETTEXT} 0 "STR:$CenaBotao"

  nsDialogs::Show
FunctionEnd
!macroend

; Antes de copiar os ficheiros: garante que a pasta escolhida termina em "Cena Um"
; (se a pessoa escolher C:\Programas, instala em C:\Programas\Cena Um)
!macro customPageAfterChangeDir
  !include StrContains.nsh
  Page custom CenaPastaFinal

Function CenaPastaFinal
  ${StrContains} $0 "${APP_FILENAME}" $INSTDIR
  ${If} $0 == ""
    StrCpy $INSTDIR "$INSTDIR\${APP_FILENAME}"
  ${EndIf}
  Abort
FunctionEnd
!macroend

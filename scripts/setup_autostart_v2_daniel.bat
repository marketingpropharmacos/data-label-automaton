@echo off
title ProPharmacos - Setup Autostart v2 (PC do Daniel)
color 0B
chcp 65001 >nul 2>&1

echo.
echo ============================================================
echo  ProPharmacos - Setup Autostart v2 - PC DO DANIEL
echo  Execute como Administrador
echo ============================================================
echo.

REM ---- Verificar Admin ----
net session >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Execute este arquivo como Administrador!
    echo Clique com botao direito - Executar como administrador
    pause
    exit /b 1
)

set PASTA=C:\servidor_rotulos
set AGENTE_ID=daniel

REM ---- Verificar pasta ----
if not exist "%PASTA%" (
    echo [ERRO] Pasta %PASTA% nao encontrada!
    echo Verifique se o agente esta instalado corretamente.
    pause
    exit /b 1
)
echo [OK] Pasta do agente: %PASTA%

REM ---- Detectar Python (path completo) ----
echo.
echo [1/5] Detectando Python...
set PYTHON_EXE=

REM Tentar via where
for /f "tokens=*" %%i in ('where python 2^>nul') do (
    if not defined PYTHON_EXE set PYTHON_EXE=%%i
)

REM Tentar locais comuns se nao encontrou
if not defined PYTHON_EXE (
    for %%p in (
        "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
        "%LOCALAPPDATA%\Programs\Python\Python39\python.exe"
        "C:\Python312\python.exe"
        "C:\Python311\python.exe"
        "C:\Python310\python.exe"
        "C:\Python39\python.exe"
    ) do (
        if not defined PYTHON_EXE (
            if exist %%p set PYTHON_EXE=%%~p
        )
    )
)

if not defined PYTHON_EXE (
    echo [ERRO] Python nao encontrado!
    echo Instale o Python e marque "Add to PATH" durante a instalacao.
    pause
    exit /b 1
)
echo [OK] Python encontrado em: %PYTHON_EXE%

REM ---- Criar arquivo de identificacao ----
echo %AGENTE_ID%> "%PASTA%\agente_id.txt"
echo [OK] Agente identificado como: %AGENTE_ID%

REM ---- Criar start_agent_v2.bat com python path fixo e logging ----
echo.
echo [2/5] Criando start_agent_v2.bat com path fixo do Python...

(
    echo @echo off
    echo title ProPharmacos - Agente de Impressao [Daniel]
    echo color 0A
    echo.
    echo set PASTA=%PASTA%
    echo set PYTHON="%PYTHON_EXE%"
    echo set LOG=%PASTA%\log_inicio.txt
    echo.
    echo echo [%%date%% %%time%%] === INICIANDO AGENTE === >> "%%LOG%%"
    echo echo [%%date%% %%time%%] Python: %%PYTHON%% >> "%%LOG%%"
    echo echo [%%date%% %%time%%] Pasta: %%PASTA%% >> "%%LOG%%"
    echo.
    echo cd /d "%%PASTA%%"
    echo.
    echo :LOOP
    echo echo.
    echo echo [%%date%% %%time%%] ============================================
    echo echo  ProPharmacos - Agente de Impressao [Daniel]
    echo echo ============================================
    echo echo [%%date%% %%time%%] Iniciando ciclo... >> "%%LOG%%"
    echo.
    echo REM Iniciar ngrok se nao estiver rodando
    echo tasklist /FI "IMAGENAME eq ngrok.exe" 2^>nul ^| find /I "ngrok.exe" ^>nul
    echo if errorlevel 1 ^(
    echo     set NGROK_EXE=
    echo     if exist "%%PASTA%%\ngrok.exe" set NGROK_EXE=%%PASTA%%\ngrok.exe
    echo     if exist "C:\ngrok\ngrok.exe" set NGROK_EXE=C:\ngrok\ngrok.exe
    echo     if exist "C:\Users\%%USERNAME%%\ngrok.exe" set NGROK_EXE=C:\Users\%%USERNAME%%\ngrok.exe
    echo     if defined NGROK_EXE ^(
    echo         echo Iniciando ngrok...
    echo         echo [%%date%% %%time%%] Iniciando ngrok: %%NGROK_EXE%% >> "%%LOG%%"
    echo         start "ngrok - ProPharmacos" "%%NGROK_EXE%%" http 5002
    echo         timeout /t 5 /nobreak ^>nul
    echo     ^) else ^(
    echo         echo [AVISO] ngrok nao encontrado - pulando.
    echo         echo [%%date%% %%time%%] ngrok nao encontrado >> "%%LOG%%"
    echo     ^)
    echo ^) else ^(
    echo     echo ngrok ja esta rodando.
    echo ^)
    echo.
    echo echo Iniciando agente de impressao...
    echo echo [%%date%% %%time%%] Executando agente Python... >> "%%LOG%%"
    echo %%PYTHON%% agente_impressao.py
    echo echo [%%date%% %%time%%] Agente parou. Reiniciando em 5s... >> "%%LOG%%"
    echo echo.
    echo echo [%%date%% %%time%%] Agente parou. Reiniciando em 5 segundos...
    echo timeout /t 5 /nobreak ^>nul
    echo goto LOOP
) > "%PASTA%\start_agent_v2.bat"

echo [OK] start_agent_v2.bat criado em %PASTA%

REM ---- Metodo 1: Registro do Windows (mais confiavel) ----
echo.
echo [3/5] Configurando Registro do Windows (metodo principal)...

reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "ProPharmacos_Agente" /f >nul 2>&1

reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "ProPharmacos_Agente" /t REG_SZ /d "cmd.exe /c start \"ProPharmacos\" \"%PASTA%\start_agent_v2.bat\"" /f
if errorlevel 1 (
    echo [ERRO] Falha ao criar chave de registro!
) else (
    echo [OK] Registro configurado: HKCU\...\Run\ProPharmacos_Agente
)

REM ---- Metodo 2: Pasta Startup (backup) ----
echo.
echo [4/5] Configurando pasta Startup (metodo backup)...

set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

del "%STARTUP%\ProPharmacos_Agente.bat" >nul 2>&1
del "%STARTUP%\ProPharmacos_Agente.lnk" >nul 2>&1

(
    echo @echo off
    echo cd /d "%PASTA%"
    echo start "ProPharmacos" "%PASTA%\start_agent_v2.bat"
) > "%STARTUP%\ProPharmacos_Agente.bat"

echo [OK] Startup criado: %STARTUP%\ProPharmacos_Agente.bat

REM ---- Metodo 3: Task Scheduler SEM /rl HIGHEST ----
echo.
echo [5/5] Configurando Task Scheduler (metodo backup 2)...

schtasks /delete /tn "ProPharmacos_Agente" /f >nul 2>&1

schtasks /create /tn "ProPharmacos_Agente" ^
    /tr "cmd.exe /c start \"ProPharmacos\" \"%PASTA%\start_agent_v2.bat\"" ^
    /sc onlogon ^
    /delay 0000:01 ^
    /ru "%USERNAME%" ^
    /f >nul 2>&1

if errorlevel 1 (
    echo [AVISO] Task Scheduler nao configurado - mas Registro e Startup devem funcionar.
) else (
    echo [OK] Task Scheduler configurado (sem elevacao UAC).
)

REM ---- Verificar ngrok ----
echo.
echo Verificando ngrok...
if exist "%PASTA%\ngrok.exe" (
    echo [OK] ngrok encontrado em %PASTA%\ngrok.exe
) else if exist "C:\ngrok\ngrok.exe" (
    echo [OK] ngrok encontrado em C:\ngrok\ngrok.exe
) else (
    echo [AVISO] ngrok nao encontrado - o agente vai rodar sem tunel.
    echo         Baixe em https://ngrok.com/download e coloque em %PASTA%\
)

echo.
echo ============================================================
echo  CONFIGURACAO V2 CONCLUIDA - PC DO DANIEL
echo.
echo  Python: %PYTHON_EXE%
echo  Agente: %PASTA%\start_agent_v2.bat
echo  Metodos de autostart configurados:
echo    1. Registro Windows (HKCU Run) - principal
echo    2. Pasta Startup               - backup
echo    3. Task Scheduler              - backup 2
echo.
echo  Para testar AGORA sem reiniciar:
echo    %PASTA%\start_agent_v2.bat
echo.
echo  Log de inicializacao:
echo    %PASTA%\log_inicio.txt
echo ============================================================
echo.
pause

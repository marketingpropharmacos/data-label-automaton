@echo off
title ProPharmacos - Diagnostico de Autostart
color 0E
chcp 65001 >nul 2>&1

set LOG=%USERPROFILE%\Desktop\diagnostico_propharmacos.txt
echo. > "%LOG%"

echo ============================================================ >> "%LOG%"
echo  ProPharmacos - Diagnostico de Autostart >> "%LOG%"
echo  Data/Hora: %date% %time% >> "%LOG%"
echo  Usuario: %USERNAME% >> "%LOG%"
echo  Computador: %COMPUTERNAME% >> "%LOG%"
echo ============================================================ >> "%LOG%"
echo. >> "%LOG%"

echo ============================================================
echo  ProPharmacos - Diagnostico de Autostart
echo  Gerando relatorio em: %LOG%
echo ============================================================
echo.

REM ---- 1. Verificar Python ----
echo [1/6] Verificando Python...
echo [1] PYTHON >> "%LOG%"

where python >nul 2>&1
if errorlevel 1 (
    echo     STATUS: NAO ENCONTRADO no PATH >> "%LOG%"
    echo [FALHA] Python NAO encontrado no PATH do sistema!
    echo     Este e provavelmente o problema principal. >> "%LOG%"
) else (
    for /f "tokens=*" %%i in ('where python 2^>nul') do (
        echo     PATH: %%i >> "%LOG%"
        echo [OK] Python encontrado em: %%i
    )
    for /f "tokens=*" %%v in ('python --version 2^>^&1') do (
        echo     VERSAO: %%v >> "%LOG%"
    )
)

REM Verificar python em locais comuns
echo     Buscando em locais comuns: >> "%LOG%"
for %%p in (
    "C:\Python39\python.exe"
    "C:\Python310\python.exe"
    "C:\Python311\python.exe"
    "C:\Python312\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python39\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    "%APPDATA%\Local\Programs\Python\Python311\python.exe"
) do (
    if exist %%p (
        echo     [ENCONTRADO] %%p >> "%LOG%"
        echo [INFO] Python tambem encontrado em: %%p
    )
)
echo. >> "%LOG%"

REM ---- 2. Verificar pasta do agente ----
echo [2/6] Verificando pasta do agente...
echo [2] PASTA DO AGENTE >> "%LOG%"

set PASTA_ENCONTRADA=NENHUMA

if exist "C:\ServidorRotulos\agente_impressao.py" (
    set PASTA_ENCONTRADA=C:\ServidorRotulos
    echo     PASTA: C:\ServidorRotulos [OK] >> "%LOG%"
    echo [OK] Pasta encontrada: C:\ServidorRotulos
)
if exist "C:\servidor_rotulos\agente_impressao.py" (
    set PASTA_ENCONTRADA=C:\servidor_rotulos
    echo     PASTA: C:\servidor_rotulos [OK] >> "%LOG%"
    echo [OK] Pasta encontrada: C:\servidor_rotulos
)
if "%PASTA_ENCONTRADA%"=="NENHUMA" (
    echo     PASTA: NAO ENCONTRADA >> "%LOG%"
    echo [FALHA] Nenhuma pasta do agente encontrada!
)

REM Verificar arquivos essenciais
if not "%PASTA_ENCONTRADA%"=="NENHUMA" (
    echo     Arquivos em %PASTA_ENCONTRADA%: >> "%LOG%"
    for %%f in (agente_impressao.py start_agent.bat agente_id.txt ngrok.exe) do (
        if exist "%PASTA_ENCONTRADA%\%%f" (
            echo       [OK] %%f >> "%LOG%"
        ) else (
            echo       [AUSENTE] %%f >> "%LOG%"
        )
    )
)
echo. >> "%LOG%"

REM ---- 3. Verificar Startup Folder ----
echo [3/6] Verificando pasta Startup...
echo [3] PASTA STARTUP >> "%LOG%"

set STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
echo     Caminho: %STARTUP% >> "%LOG%"

if exist "%STARTUP%\ProPharmacos_Agente.bat" (
    echo     ProPharmacos_Agente.bat: EXISTE [OK] >> "%LOG%"
    echo [OK] Arquivo de Startup encontrado.
    echo     Conteudo: >> "%LOG%"
    type "%STARTUP%\ProPharmacos_Agente.bat" >> "%LOG%"
) else (
    echo     ProPharmacos_Agente.bat: NAO EXISTE [FALHA] >> "%LOG%"
    echo [FALHA] Arquivo de Startup NAO encontrado!
    echo     Provavelmente foi deletado (antivirus ou manualmente). >> "%LOG%"
)

if exist "%STARTUP%\ProPharmacos_Agente.lnk" (
    echo     ProPharmacos_Agente.lnk: EXISTE >> "%LOG%"
) else (
    echo     ProPharmacos_Agente.lnk: AUSENTE >> "%LOG%"
)
echo. >> "%LOG%"

REM ---- 4. Verificar Registro do Windows ----
echo [4/6] Verificando Registro do Windows...
echo [4] REGISTRO DO WINDOWS >> "%LOG%"

reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "ProPharmacos_Agente" >nul 2>&1
if errorlevel 1 (
    echo     HKCU Run - ProPharmacos_Agente: NAO EXISTE >> "%LOG%"
    echo [INFO] Chave de registro nao encontrada (sera criada pelo setup v2).
) else (
    echo     HKCU Run - ProPharmacos_Agente: EXISTE [OK] >> "%LOG%"
    reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "ProPharmacos_Agente" >> "%LOG%" 2>&1
    echo [OK] Chave de registro encontrada.
)
echo. >> "%LOG%"

REM ---- 5. Verificar Task Scheduler ----
echo [5/6] Verificando Task Scheduler...
echo [5] TASK SCHEDULER >> "%LOG%"

schtasks /query /tn "ProPharmacos_Agente" >nul 2>&1
if errorlevel 1 (
    echo     Tarefa ProPharmacos_Agente: NAO EXISTE >> "%LOG%"
    echo [INFO] Tarefa no Task Scheduler nao encontrada.
) else (
    echo     Tarefa ProPharmacos_Agente: EXISTE >> "%LOG%"
    schtasks /query /tn "ProPharmacos_Agente" /fo LIST >> "%LOG%" 2>&1
    echo [OK] Tarefa encontrada no Task Scheduler.
    schtasks /query /tn "ProPharmacos_Agente" /fo LIST | find "Status"
)
echo. >> "%LOG%"

REM ---- 6. Verificar se agente esta rodando agora ----
echo [6/6] Verificando processos ativos...
echo [6] PROCESSOS ATIVOS >> "%LOG%"

tasklist /FI "IMAGENAME eq python.exe" 2>nul | find /I "python.exe" >nul
if errorlevel 1 (
    echo     python.exe: NAO RODANDO >> "%LOG%"
    echo [INFO] Agente Python nao esta rodando no momento.
) else (
    echo     python.exe: RODANDO [OK] >> "%LOG%"
    echo [OK] Python esta rodando.
    tasklist /FI "IMAGENAME eq python.exe" >> "%LOG%" 2>&1
)

tasklist /FI "IMAGENAME eq ngrok.exe" 2>nul | find /I "ngrok.exe" >nul
if errorlevel 1 (
    echo     ngrok.exe: NAO RODANDO >> "%LOG%"
    echo [INFO] ngrok nao esta rodando.
) else (
    echo     ngrok.exe: RODANDO [OK] >> "%LOG%"
    echo [OK] ngrok esta rodando.
)
echo. >> "%LOG%"

REM ---- Log de inicializacao anterior ----
echo [EXTRA] LOG DE INICIALIZACOES ANTERIORES >> "%LOG%"
if not "%PASTA_ENCONTRADA%"=="NENHUMA" (
    if exist "%PASTA_ENCONTRADA%\log_inicio.txt" (
        echo     Ultimas 20 linhas do log: >> "%LOG%"
        powershell -command "Get-Content '%PASTA_ENCONTRADA%\log_inicio.txt' | Select-Object -Last 20" >> "%LOG%" 2>&1
    ) else (
        echo     log_inicio.txt: nao existe ainda >> "%LOG%"
    )
)
echo. >> "%LOG%"

echo ============================================================ >> "%LOG%"
echo  FIM DO DIAGNOSTICO >> "%LOG%"
echo ============================================================ >> "%LOG%"

echo.
echo ============================================================
echo  DIAGNOSTICO CONCLUIDO!
echo.
echo  Relatorio salvo em:
echo  %LOG%
echo.
echo  Envie esse arquivo para o Felipe analisar.
echo ============================================================
echo.
pause

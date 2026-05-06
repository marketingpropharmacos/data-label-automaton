@echo off
title Agente Vitae - Inicializacao
color 0A
cd /d C:\ServidorRotulos

:: ─── TOKEN GITHUB (repositorio privado) ───────────────────────────────────
:: Cole seu token aqui (Settings > Developer Settings > Personal Access Tokens)
set GH_TOKEN=SEU_TOKEN_AQUI

:: ─── CAMINHOS ──────────────────────────────────────────────────────────────
set NGROK_EXE=C:\Users\Administrador.PROCARAIBAS\Desktop\ngrok.exe
set NGROK_CFG=C:\Users\Administrador.PROCARAIBAS\ngrok-vitae.yml
set NGROK_DOMAIN=authentic-unworried-ounce.ngrok-free.dev
set AGENTE_PY=C:\ServidorRotulos\agente_vitae.py
set PORTA=5001

echo =========================================
echo   Agente Vitae - Inicializacao
echo =========================================
echo.

:: ─── [1] Encerrar processos anteriores ────────────────────────────────────
echo [1/5] Encerrando processos anteriores...
taskkill /F /FI "WINDOWTITLE eq Agente Vitae*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq ngrok Vitae*"  >nul 2>&1
timeout /t 2 /nobreak >nul
echo       OK

:: ─── [2] Atualizar agente do GitHub ────────────────────────────────────────
echo.
echo [2/5] Baixando agente_vitae.py do GitHub...

curl -s -L -o "%AGENTE_PY%.tmp" ^
     -H "Authorization: token %GH_TOKEN%" ^
     -H "User-Agent: Mozilla/5.0" ^
     "https://raw.githubusercontent.com/marketingpropharmacos/data-label-automaton/main/agente_vitae.py"

if errorlevel 1 (
    echo       [AVISO] Falha no download. Usando versao existente.
) else (
    :: Verifica se o arquivo baixado parece valido (tem mais de 1KB)
    for %%A in ("%AGENTE_PY%.tmp") do set TAMANHO=%%~zA
    if %TAMANHO% GTR 1000 (
        move /Y "%AGENTE_PY%.tmp" "%AGENTE_PY%" >nul
        echo       OK - Agente atualizado
    ) else (
        del "%AGENTE_PY%.tmp" >nul 2>&1
        echo       [AVISO] Arquivo invalido baixado. Usando versao existente.
    )
)

:: ─── [3] Verificar Python e dependencias ───────────────────────────────────
echo.
echo [3/5] Verificando Python e dependencias...
python --version >nul 2>&1
if errorlevel 1 (
    echo       [ERRO] Python nao encontrado no PATH!
    echo       Instale Python 3.x e adicione ao PATH do sistema.
    pause
    exit /b 1
)

pip install flask flask-cors fdb --quiet --exists-action i >nul 2>&1
echo       OK

:: ─── [4] Iniciar agente na porta 5001 ──────────────────────────────────────
echo.
echo [4/5] Iniciando agente Python na porta %PORTA%...
if not exist "%AGENTE_PY%" (
    echo       [ERRO] agente_vitae.py nao encontrado em C:\ServidorRotulos!
    pause
    exit /b 1
)

start "Agente Vitae - porta %PORTA%" cmd /k "cd /d C:\ServidorRotulos && python agente_vitae.py"
timeout /t 5 /nobreak >nul
echo       OK

:: ─── [5] Iniciar ngrok ─────────────────────────────────────────────────────
echo.
echo [5/5] Iniciando tunel ngrok (%NGROK_DOMAIN%)...
if not exist "%NGROK_EXE%" (
    echo       [ERRO] ngrok.exe nao encontrado em:
    echo       %NGROK_EXE%
    pause
    exit /b 1
)

if exist "%NGROK_CFG%" (
    start "ngrok Vitae" "%NGROK_EXE%" http --config="%NGROK_CFG%" --domain=%NGROK_DOMAIN% %PORTA%
) else (
    echo       [AVISO] ngrok-vitae.yml nao encontrado. Iniciando sem config...
    start "ngrok Vitae" "%NGROK_EXE%" http --domain=%NGROK_DOMAIN% %PORTA%
)

timeout /t 4 /nobreak >nul
echo       OK

:: ─── Resultado ─────────────────────────────────────────────────────────────
echo.
echo =========================================
echo   TUDO INICIADO COM SUCESSO!
echo.
echo   Teste de saude:
echo   https://%NGROK_DOMAIN%/api/health
echo.
echo   Para encerrar, feche as janelas:
echo     "Agente Vitae - porta %PORTA%"
echo     "ngrok Vitae"
echo =========================================
echo.
pause

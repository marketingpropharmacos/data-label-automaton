@echo off
title Atualizar Agente Vitae
color 0B
cd /d C:\ServidorRotulos

:: TOKEN GITHUB
if not exist "C:\ServidorRotulos\gh_token.txt" (
    echo [ERRO] gh_token.txt nao encontrado em C:\ServidorRotulos\
    pause
    exit /b 1
)
set /p GH_TOKEN=<"C:\ServidorRotulos\gh_token.txt"

echo =========================================
echo   Atualizando agente_vitae.py
echo =========================================
echo.

:: Download do GitHub
curl -s -L -o agente_vitae.py.tmp ^
     -H "Authorization: token %GH_TOKEN%" ^
     -H "User-Agent: Mozilla/5.0" ^
     "https://raw.githubusercontent.com/marketingpropharmacos/data-label-automaton/main/agente_vitae.py"

if errorlevel 1 (
    echo [ERRO] Falha no download.
    del agente_vitae.py.tmp >nul 2>&1
    pause
    exit /b 1
)

for %%A in (agente_vitae.py.tmp) do set TAMANHO=%%~zA
if %TAMANHO% LSS 1000 (
    echo [ERRO] Arquivo invalido ^(%TAMANHO% bytes^). Token expirado?
    del agente_vitae.py.tmp >nul 2>&1
    pause
    exit /b 1
)

move /Y agente_vitae.py.tmp agente_vitae.py >nul
echo [OK] agente_vitae.py atualizado! ^(%TAMANHO% bytes^)
echo.

:: Matar TODOS os processos Python (inclui filhos) - unico jeito garantido
echo Encerrando todos os processos Python...
taskkill /F /IM python.exe /T >nul 2>&1
taskkill /F /IM python3.exe /T >nul 2>&1
timeout /t 3 /nobreak >nul
echo [OK] Processos encerrados

:: Iniciar novo agente
echo.
echo Iniciando agente na porta 5001...
start "Agente Vitae - porta 5001" cmd /k "cd /d C:\ServidorRotulos && python agente_vitae.py"
timeout /t 4 /nobreak >nul

echo.
echo =========================================
echo   Agente reiniciado!
echo.
echo   Health:     https://authentic-unworried-ounce.ngrok-free.dev/api/health
echo   Atendentes: https://authentic-unworried-ounce.ngrok-free.dev/api/atendentes
echo =========================================
echo.
pause

@echo off
title Atualizar Agente Vitae
color 0B
cd /d C:\ServidorRotulos

:: Token GitHub — necessario para repositorio privado
set GH_TOKEN=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

echo =========================================
echo   Atualizando agente_vitae.py
echo =========================================
echo.

curl -s -L -o agente_vitae.py.tmp ^
     -H "Authorization: token %GH_TOKEN%" ^
     -H "User-Agent: Mozilla/5.0" ^
     "https://raw.githubusercontent.com/marketingpropharmacos/data-label-automaton/main/agente_vitae.py"

if errorlevel 1 (
    echo [ERRO] Falha no download. Verifique a conexao.
    del agente_vitae.py.tmp >nul 2>&1
    pause
    exit /b 1
)

for %%A in (agente_vitae.py.tmp) do set TAMANHO=%%~zA
if %TAMANHO% LSS 1000 (
    echo [ERRO] Arquivo invalido ^(tamanho: %TAMANHO% bytes^). Token expirado?
    del agente_vitae.py.tmp >nul 2>&1
    pause
    exit /b 1
)

move /Y agente_vitae.py.tmp agente_vitae.py >nul
echo [OK] agente_vitae.py atualizado!
echo.

echo Encerrando agente anterior...
taskkill /F /FI "WINDOWTITLE eq Agente Vitae*" >nul 2>&1
timeout /t 2 /nobreak >nul

echo Iniciando agente na porta 5001...
start "Agente Vitae - porta 5001" cmd /k "cd /d C:\ServidorRotulos && python agente_vitae.py"

echo.
echo =========================================
echo   Agente reiniciado com versao mais recente!
echo   Teste: https://authentic-unworried-ounce.ngrok-free.dev/api/health
echo =========================================
echo.
pause

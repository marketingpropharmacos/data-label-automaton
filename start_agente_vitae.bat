@echo off
title Agente Vitae - FormulaCerta (porta 5001)
color 0A
cd /d "%~dp0"

echo =========================================
echo   Agente Vitae  -  Pro Vitae Farmacia
echo   FormulaCerta Query Agent  -  Porta 5001
echo =========================================
echo.

:: Verifica se Python esta disponivel
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado. Instale o Python e tente novamente.
    pause
    exit /b 1
)

:: Instala dependencias se necessario
echo [INFO] Verificando dependencias...
pip install flask flask-cors fdb --quiet

echo.
echo [INFO] Iniciando agente na porta 5001...
echo [INFO] Pressione Ctrl+C para encerrar.
echo.

python agente_vitae.py

pause

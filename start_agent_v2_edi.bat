@echo off
setlocal enabledelayedexpansion
title ProPharmacos - Agente de Impressao [Edi]
color 0A

set PASTA=C:\servidor_rotulos
set PYTHON=C:\Users\Dell\AppData\Local\Microsoft\WindowsApps\python.exe
set LOG=%PASTA%\log_inicio.txt

echo [%date% %time%] === INICIANDO AGENTE === >> "%LOG%"
cd /d "%PASTA%"

:LOOP
echo.
echo [%date% %time%] ============================================
echo  ProPharmacos - Agente de Impressao [Edi]
echo ============================================
echo [%date% %time%] Iniciando ciclo... >> "%LOG%"

REM Iniciar ngrok se nao estiver rodando
tasklist /FI "IMAGENAME eq ngrok.exe" 2>nul | find /I "ngrok.exe" >nul
if errorlevel 1 (
    echo Iniciando ngrok...
    echo [%date% %time%] Iniciando ngrok... >> "%LOG%"
    start "ngrok - ProPharmacos" "%PASTA%\ngrok.exe" http 5002
    timeout /t 5 /nobreak >nul
) else (
    echo ngrok ja esta rodando.
)

echo Iniciando agente de impressao...
echo [%date% %time%] Executando agente Python... >> "%LOG%"
"%PYTHON%" agente_impressao.py

echo [%date% %time%] Agente parou. Reiniciando em 5s... >> "%LOG%"
echo.
echo [%date% %time%] Agente parou. Reiniciando em 5 segundos...
timeout /t 5 /nobreak >nul
goto LOOP

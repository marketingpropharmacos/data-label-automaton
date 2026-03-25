@echo off
title ProPharmacos - Agente de Impressao
color 0A

cd /d "C:\servidor_rotulos"
if errorlevel 1 (
    echo ERRO: Pasta C:\servidor_rotulos nao encontrada!
    pause
    exit /b 1
)

:LOOP
echo.
echo [%date% %time%] Iniciando agente de impressao...
echo Nao feche esta janela.
echo.

python agente_impressao.py

echo.
echo [%date% %time%] Agente parou. Reiniciando em 5 segundos...
echo (Pressione Ctrl+C para cancelar)
timeout /t 5 /nobreak >nul
goto LOOP

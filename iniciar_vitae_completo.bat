@echo off
title Agente Vitae - Setup e Inicializacao
color 0A
cd /d C:\ServidorRotulos

echo =========================================
echo   Agente Vitae - Setup Completo
echo =========================================
echo.

echo [1/4] Baixando agente_vitae.py do GitHub...
python -c "import urllib.request,json,base64;req=urllib.request.Request('https://api.github.com/repos/marketingpropharmacos/data-label-automaton/contents/agente_vitae.py',headers={'User-Agent':'Mozilla/5.0'});r=urllib.request.urlopen(req);d=json.loads(r.read());open('C:/ServidorRotulos/agente_vitae.py','wb').write(base64.b64decode(d['content'].replace('\n','')))"
echo Feito.
echo.

echo [2/4] Instalando dependencias Python...
pip install flask flask-cors fdb --quiet
echo Feito.
echo.

echo [3/4] Iniciando agente na porta 5001...
start "Agente Vitae - porta 5001" cmd /k "cd /d C:\ServidorRotulos && python agente_vitae.py"
timeout /t 4 /nobreak >nul
echo Feito.
echo.

echo [4/4] Iniciando tunel ngrok...
start "ngrok Vitae" "C:\Users\Administrador.PROCARAIBAS\Desktop\ngrok.exe" http --config="C:\Users\Administrador.PROCARAIBAS\ngrok-vitae.yml" --domain=authentic-unworried-ounce.ngrok-free.dev 5001

echo.
echo =========================================
echo   Tudo iniciado!
echo   Teste no navegador:
echo   https://authentic-unworried-ounce.ngrok-free.dev/api/health
echo =========================================
pause

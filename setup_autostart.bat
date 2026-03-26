@echo off
title ProPharmacos - Configuracao Inicial
color 0B

echo.
echo ============================================================
echo  ProPharmacos - Setup de Inicializacao Automatica
echo  Execute como Administrador
echo ============================================================
echo.

REM Verificar se esta rodando como Administrador
net session >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Execute este arquivo como Administrador!
    echo Clique com botao direito -> Executar como administrador
    pause
    exit /b 1
)

echo [1/4] Registrando agente para iniciar com o Windows...
schtasks /delete /tn "ProPharmacos_Agente" /f >nul 2>&1
schtasks /create /tn "ProPharmacos_Agente" ^
    /tr "\"C:\servidor_rotulos\start_agent.bat\"" ^
    /sc onlogon ^
    /delay 0000:30 ^
    /rl HIGHEST ^
    /f
if errorlevel 1 (
    echo [ERRO] Falha ao registrar no Task Scheduler.
) else (
    echo [OK] Agente configurado para iniciar automaticamente no login.
)

echo.
echo [2/4] Ativando servidor SSH no Windows...
powershell -Command "Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0" >nul 2>&1
powershell -Command "Start-Service sshd" >nul 2>&1
powershell -Command "Set-Service -Name sshd -StartupType Automatic" >nul 2>&1
if errorlevel 1 (
    echo [AVISO] SSH pode ja estar instalado ou requer reinicio.
) else (
    echo [OK] SSH ativado e configurado para iniciar automaticamente.
)

echo.
echo [3/4] Liberando porta SSH no firewall...
netsh advfirewall firewall add rule name="SSH ProPharmacos" dir=in action=allow protocol=TCP localport=22 >nul 2>&1
echo [OK] Porta 22 liberada no firewall.

echo.
echo [4/4] Coletando informacoes deste PC...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set IP=%%a
    goto :found_ip
)
:found_ip
set IP=%IP: =%
echo [OK] IP deste PC: %IP%
echo [OK] Usuario: %USERNAME%

echo.
echo ============================================================
echo  CONFIGURACAO CONCLUIDA!
echo
echo  IP deste PC : %IP%
echo  Usuario     : %USERNAME%
echo  Porta SSH   : 22
echo
echo  Anote essas informacoes e envie para o Felipe configurar
echo  o acesso remoto do Mac.
echo ============================================================
echo.
pause

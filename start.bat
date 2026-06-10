@echo off
rem worldsim-ui launcher: double-click to install deps on first run and start everything.
rem If the Claude spike server is present in this branch, it starts in a second window.
chcp 65001 >nul
title worldsim-ui
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo [worldsim-ui] Node.js не найден. Установите LTS с https://nodejs.org и запустите снова.
    pause
    exit /b 1
)

if not exist node_modules (
    echo [worldsim-ui] Первый запуск: устанавливаю зависимости UI. Это займёт минуту-другую...
    call npm install
    if errorlevel 1 (
        echo [worldsim-ui] Ошибка npm install. Текст ошибки выше.
        pause
        exit /b 1
    )
)

if exist server\package.json (
    if exist server\.env (
        echo [worldsim-ui] Нашёл Claude-сервер: поднимаю его в отдельном окне на :8787
        start "worldsim-ui server" cmd /k "cd /d "%~dp0server" && if not exist node_modules call npm install && npm run dev"
    ) else (
        echo [worldsim-ui] server\ есть, но нет server\.env с ANTHROPIC_API_KEY — режим Claude работать не будет.
        echo [worldsim-ui] Запускаю только UI: режим Fixture полностью рабочий.
    )
)

echo [worldsim-ui] Запускаю UI. Браузер откроется сам, обычно на http://localhost:5173
echo [worldsim-ui] Движок переключается в игре: шестерёнка -^> «Движок мира» -^> Claude.
echo [worldsim-ui] Остановить: Ctrl+C или закрыть окна.
call npm run dev -- --open

pause

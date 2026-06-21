@echo off
echo ==========================================
echo   Stock Market Analysis App
echo ==========================================
echo.

cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    echo This may take a few minutes on first run.
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

:: Check if frontend is built
if not exist "dist\renderer\index.html" (
    echo Building frontend...
    npm run build:renderer
    if %errorlevel% neq 0 (
        echo ERROR: Failed to build frontend
        pause
        exit /b 1
    )
    echo.
)

:: Start server
echo Starting server...
echo.
echo ==========================================
echo   App running at: http://localhost:3001
echo   Press Ctrl+C to stop the server
echo ==========================================
echo.
node server.js

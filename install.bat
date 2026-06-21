@echo off
echo ==========================================
echo   Stock Market Analysis App - Setup
echo ==========================================
echo.

cd /d "%~dp0"

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo.
    echo Please install Node.js first:
    echo   1. Go to https://nodejs.org/
    echo   2. Download the LTS version (20.x or higher)
    echo   3. Run the installer with default options
    echo   4. Restart this script after installation
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found:
node --version
echo.

echo [OK] npm found:
npm --version
echo.

echo ==========================================
echo   Step 1: Installing dependencies
echo ==========================================
echo.
npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install dependencies
    echo Try running: npm cache clean --force
    echo Then run this script again.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   Step 2: Building frontend
echo ==========================================
echo.
npm run build:renderer
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to build frontend
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   Installation Complete!
echo ==========================================
echo.
echo To start the application:
echo   - Double-click start.bat
echo   - Or run: node server.js
echo.
echo Then open http://localhost:3001 in your browser
echo.
pause

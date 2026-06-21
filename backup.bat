@echo off
echo ==========================================
echo   Stock Market Analysis App - Backup
echo ==========================================
echo.

cd /d "%~dp0"

:: Create backup directory if not exists
set BACKUP_DIR=%~dp0backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: Generate timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%

:: Backup data.json
if exist "data.json" (
    copy "data.json" "%BACKUP_DIR%\data_%TIMESTAMP%.json" >nul
    echo [OK] Backed up data.json to:
    echo      %BACKUP_DIR%\data_%TIMESTAMP%.json
) else (
    echo [INFO] No data.json found - nothing to backup
)

echo.
echo Backup complete!
echo.

:: Show recent backups
echo Recent backups:
dir /b /o-d "%BACKUP_DIR%\data_*.json" 2>nul | head -5

echo.
pause

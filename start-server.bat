@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   BananaBrain - PHP Development Server
echo ============================================
echo.
set "PHP_EXE=php"
where php >nul 2>&1
if errorlevel 1 (
    if exist "C:\xampp\php\php.exe" (
        set "PHP_EXE=C:\xampp\php\php.exe"
    ) else (
        echo PHP was not found. Install PHP or XAMPP, then run this file again.
        echo If XAMPP is installed elsewhere, add its php folder to PATH.
        pause
        exit /b 1
    )
)

echo Starting PHP server on http://localhost:8000
start "BananaBrain PHP Server" "%PHP_EXE%" -S localhost:8000 backend/router.php

for /L %%i in (1,1,20) do (
    curl.exe --silent --fail http://localhost:8000/ >nul 2>&1
    if not errorlevel 1 goto server_ready
    timeout /t 1 /nobreak >nul
)

echo The server did not start. Check the BananaBrain PHP Server window for errors.
pause
exit /b 1

:server_ready
echo Opening BananaBrain in your browser...
start "" "http://localhost:8000"
echo.
echo Leave the BananaBrain PHP Server window open while you play.
echo Close that window to stop the server.
endlocal

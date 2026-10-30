@echo off
setlocal

set "FRONTEND_DIR=%~dp0frontend"
set "BUILD_EXIT_CODE=1"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js 22 or newer and run this script again.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js 22 or newer and run this script again.
  exit /b 1
)

for /f "delims=" %%V in ('node -p "Number(process.versions.node.split('.')[0])" 2^>nul') do set "NODE_MAJOR=%%V"
if not defined NODE_MAJOR (
  echo Could not determine the installed Node.js version.
  exit /b 1
)
if %NODE_MAJOR% LSS 22 (
  echo Node.js 22 or newer is required. Found version %NODE_MAJOR%.
  exit /b 1
)

pushd "%FRONTEND_DIR%"
if errorlevel 1 (
  echo Could not access the frontend directory: "%FRONTEND_DIR%"
  exit /b 1
)

call npm ci
if errorlevel 1 (
  set "BUILD_EXIT_CODE=%ERRORLEVEL%"
  goto :build_failed
)

call npx expo export --platform web
if errorlevel 1 (
  set "BUILD_EXIT_CODE=%ERRORLEVEL%"
  goto :build_failed
)

if not exist "dist\index.html" (
  echo Web export completed without creating frontend\dist\index.html.
  goto :build_failed
)

popd
echo Web build is ready in frontend\dist.
echo Run web.bat from the repository root to serve it on port 5000.
exit /b 0

:build_failed
popd
exit /b %BUILD_EXIT_CODE%

@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "BACKEND_DIR=%SCRIPT_DIR%backend"

if not exist "%BACKEND_DIR%\package.json" (
  echo Backend not found at: "%BACKEND_DIR%"
  exit /b 1
)

where winget >nul 2>nul
if errorlevel 1 (
  echo WinGet is required. Install App Installer from the Microsoft Store and run this script again.
  exit /b 1
)

where git >nul 2>nul
if errorlevel 1 (
  winget install --id Git.Git --exact --accept-package-agreements --accept-source-agreements --disable-interactivity
  if errorlevel 1 exit /b 1
)

where yt-dlp >nul 2>nul
if errorlevel 1 (
  winget install --id yt-dlp.yt-dlp --exact --accept-package-agreements --accept-source-agreements --disable-interactivity
  if errorlevel 1 exit /b 1
)

set "PATH=%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\nodejs;%ProgramFiles%\Git\cmd;%LOCALAPPDATA%\Microsoft\WinGet\Links;%PATH%"

where node >nul 2>nul
if errorlevel 1 (
  winget install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements --disable-interactivity
  if errorlevel 1 exit /b 1
  set "PATH=%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\nodejs;%PATH%"
)

for /f "delims=" %%V in ('node -p "Number(process.versions.node.split('.')[0])" 2^>nul') do set "NODE_MAJOR=%%V"
if not defined NODE_MAJOR (
  echo Node.js could not be found. Open a new terminal and run this script again.
  exit /b 1
)

if %NODE_MAJOR% LSS 22 (
  winget upgrade --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements --disable-interactivity
  if errorlevel 1 (
    echo Could not upgrade Node.js. Install Node.js 22 or newer and run this script again.
    exit /b 1
  )
  set "PATH=%ProgramFiles%\nodejs;%LOCALAPPDATA%\Programs\nodejs;%PATH%"
  for /f "delims=" %%V in ('node -p "Number(process.versions.node.split('.')[0])" 2^>nul') do set "NODE_MAJOR=%%V"
  if not defined NODE_MAJOR (
    echo Node.js could not be found after the upgrade.
    exit /b 1
  )
  if %NODE_MAJOR% LSS 22 (
    echo Node.js 22 or newer is required. Found version %NODE_MAJOR%.
    exit /b 1
  )
)

node --version
pushd "%BACKEND_DIR%"
call npm install
if errorlevel 1 (
  popd
  exit /b 1
)
call npm start
set "SERVER_EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %SERVER_EXIT_CODE%

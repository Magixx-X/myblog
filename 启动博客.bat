@echo off
setlocal

REM ============================================================
REM  My Blog - Dev Server Launcher (double-click me)
REM
REM  All logic lives in scripts/start-dev.mjs:
REM    - auto npm install when node_modules is missing
REM    - free port 5173 from orphan vite processes
REM    - start vite and open the browser
REM
REM  This file just finds Node and hands over.
REM ============================================================

REM  %~dp0 ends with a backslash, so `cd /d "%~dp0"` would become
REM  `cd /d "E:\path\"` and that closing \" can be parsed as an
REM  escaped quote. Appending a dot sidesteps the trap.
pushd "%~dp0."

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [ERROR] "node" not found on PATH.
  echo.
  echo   Install Node.js 18+ from https://nodejs.org/
  echo   then reopen this window.
  echo.
  popd
  pause
  exit /b 1
)

node "scripts\start-dev.mjs"
set "RC=%ERRORLEVEL%"

popd

REM Keep the window open on failure so the message stays readable.
if not "%RC%"=="0" (
  echo.
  echo   [Exited with code %RC% - press any key to close]
  pause >nul
)

exit /b %RC%

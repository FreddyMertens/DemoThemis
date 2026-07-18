@echo off
cd /d "%~dp0"
node tools\preview-mvp.js
if errorlevel 1 pause

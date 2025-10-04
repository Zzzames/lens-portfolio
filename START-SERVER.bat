@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   启动摄影网站服务器
echo ========================================
echo.
echo 正在启动服务器...
python api-server.py
pause

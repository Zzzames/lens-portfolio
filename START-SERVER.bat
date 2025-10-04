@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   摄影网站 API 服务器启动脚本
echo ========================================
echo.
echo 正在启动服务器...
echo.

python api-server.py

if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo   服务器启动失败！
    echo ========================================
    echo.
    echo 可能的原因：
    echo 1. Python 未安装或未添加到环境变量
    echo 2. 端口 8000 已被占用
    echo 3. 权限不足
    echo.
    pause
) else (
    echo.
    echo ========================================
    echo   服务器已关闭
    echo ========================================
    echo.
    pause
)


#!/bin/bash

echo ""
echo "========================================"
echo "  摄影网站 API 服务器启动脚本"
echo "========================================"
echo ""
echo "正在启动服务器..."
echo ""

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo "错误: Python3 未安装或未添加到PATH"
    echo "请先安装 Python 3.x"
    exit 1
fi

# 启动服务器
python3 api-server.py

if [ $? -ne 0 ]; then
    echo ""
    echo "========================================"
    echo "  服务器启动失败！"
    echo "========================================"
    echo ""
    echo "可能的原因："
    echo "1. 端口 8000 已被占用"
    echo "2. 权限不足"
    echo "3. Python 版本不兼容（需要 3.6+）"
    echo ""
    exit 1
else
    echo ""
    echo "========================================"
    echo "  服务器已关闭"
    echo "========================================"
    echo ""
fi


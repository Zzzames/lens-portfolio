#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
摄影网站 API 服务器
提供图片上传、元数据保存、个人信息更新等功能
"""

import http.server
import socketserver
import json
import os
import sys
import traceback
from urllib.parse import urlparse, parse_qs
from datetime import datetime

# 设置端口
PORT = 8000

# 支持的图片格式
ALLOWED_EXTENSIONS = {'.webp'}

# 项目根目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class PhotoWebsiteAPIHandler(http.server.SimpleHTTPRequestHandler):
    """
    自定义HTTP请求处理器
    处理API请求和静态文件服务
    """
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        print(f"[{timestamp}] {format % args}")
    
    def send_cors_headers(self):
        """发送CORS头，允许跨域请求"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    
    def send_json_response(self, data, status=200):
        """发送JSON响应"""
        self.send_response(status)
        self.send_header('Content-type', 'application/json; charset=utf-8')
        self.send_cors_headers()
        self.end_headers()
        
        response = json.dumps(data, ensure_ascii=False)
        self.wfile.write(response.encode('utf-8'))
    
    def do_OPTIONS(self):
        """处理OPTIONS请求（CORS预检）"""
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        """处理GET请求"""
        # 解析URL
        parsed_path = urlparse(self.path)
        
        # API路由
        if parsed_path.path == '/api/health':
            self.handle_health_check()
        else:
            # 静态文件服务
            super().do_GET()
    
    def do_POST(self):
        """处理POST请求"""
        # 解析URL
        parsed_path = urlparse(self.path)
        
        # API路由
        if parsed_path.path == '/api/save-metadata':
            self.handle_save_metadata()
        elif parsed_path.path == '/api/upload-image':
            self.handle_upload_image()
        elif parsed_path.path == '/api/save-profile':
            self.handle_save_profile()
        else:
            self.send_json_response({
                'success': False,
                'message': f'未知的API路径: {parsed_path.path}'
            }, 404)
    
    def handle_health_check(self):
        """健康检查"""
        self.send_json_response({
            'success': True,
            'message': 'API服务器运行正常',
            'timestamp': datetime.now().isoformat()
        })
    
    def handle_save_metadata(self):
        """保存图片元数据"""
        try:
            # 读取请求体
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # 解析JSON
            data = json.loads(post_data.decode('utf-8'))
            
            # 保存到文件
            metadata_path = os.path.join(BASE_DIR, 'data', 'site-images-metadata.json')
            
            # 确保目录存在
            os.makedirs(os.path.dirname(metadata_path), exist_ok=True)
            
            # 写入文件
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"✓ 元数据已保存: {metadata_path}")
            
            self.send_json_response({
                'success': True,
                'message': '元数据保存成功',
                'path': metadata_path
            })
            
        except Exception as e:
            print(f"✗ 保存元数据失败: {str(e)}")
            traceback.print_exc()
            
            self.send_json_response({
                'success': False,
                'message': f'保存元数据失败: {str(e)}'
            }, 500)
    
    def handle_save_profile(self):
        """保存个人信息"""
        try:
            # 读取请求体
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # 解析JSON
            data = json.loads(post_data.decode('utf-8'))
            
            print(f"[DEBUG] 接收到个人信息: {json.dumps(data, ensure_ascii=False, indent=2)}")
            
            # 修正logo路径（如果需要）
            if 'logos' in data:
                for logo in data['logos']:
                    if 'src' in logo:
                        # 将 ./images/admin-images/ 或 ./images/ 替换为 ../images/
                        src = logo['src']
                        if src.startswith('./images/admin-images/'):
                            logo['src'] = '../images/' + src.replace('./images/admin-images/', '')
                        elif src.startswith('./images/'):
                            logo['src'] = '../images/' + src.replace('./images/', '')
                        print(f"[DEBUG] 修正logo路径: {src} -> {logo['src']}")
            
            # 保存到文件
            profile_path = os.path.join(BASE_DIR, 'data', 'profile-data.json')
            
            # 确保目录存在
            os.makedirs(os.path.dirname(profile_path), exist_ok=True)
            
            # 写入文件
            with open(profile_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            print(f"✓ 个人信息已保存: {profile_path}")
            
            self.send_json_response({
                'success': True,
                'message': '个人信息保存成功',
                'path': profile_path
            })
            
        except Exception as e:
            print(f"✗ 保存个人信息失败: {str(e)}")
            traceback.print_exc()
            
            self.send_json_response({
                'success': False,
                'message': f'保存个人信息失败: {str(e)}'
            }, 500)
    
    def handle_upload_image(self):
        """处理图片上传"""
        try:
            # 获取Content-Type
            content_type = self.headers['Content-Type']
            
            if not content_type or 'multipart/form-data' not in content_type:
                raise ValueError('请求必须是 multipart/form-data 类型')
            
            # 提取boundary
            boundary = content_type.split('boundary=')[1].encode()
            
            # 读取请求体
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # 手动解析multipart/form-data
            parts = self.parse_multipart(post_data, boundary)
            
            if 'file' not in parts or 'folder' not in parts:
                raise ValueError('缺少必要的参数: file 或 folder')
            
            file_data = parts['file']
            folder = parts['folder'].decode('utf-8')
            filename = parts.get('filename', b'uploaded.webp').decode('utf-8')
            
            # 验证文件扩展名
            file_ext = os.path.splitext(filename)[1].lower()
            if file_ext not in ALLOWED_EXTENSIONS:
                raise ValueError(f'不支持的文件格式: {file_ext}')
            
            # 构建保存路径
            images_dir = os.path.join(BASE_DIR, 'images', folder)
            os.makedirs(images_dir, exist_ok=True)
            
            file_path = os.path.join(images_dir, filename)
            
            # 保存文件
            with open(file_path, 'wb') as f:
                f.write(file_data)
            
            print(f"✓ 图片已上传: {file_path}")
            
            self.send_json_response({
                'success': True,
                'message': '图片上传成功',
                'path': f'images/{folder}/{filename}',
                'filename': filename
            })
            
        except Exception as e:
            print(f"✗ 图片上传失败: {str(e)}")
            traceback.print_exc()
            
            self.send_json_response({
                'success': False,
                'message': f'图片上传失败: {str(e)}'
            }, 500)
    
    def parse_multipart(self, data, boundary):
        """手动解析multipart/form-data（替代已废弃的cgi模块）"""
        parts = {}
        
        # 分割数据
        boundary_delimiter = b'--' + boundary
        sections = data.split(boundary_delimiter)
        
        for section in sections:
            if not section or section == b'--\r\n' or section == b'--':
                continue
            
            # 分离headers和content
            if b'\r\n\r\n' in section:
                headers_part, content = section.split(b'\r\n\r\n', 1)
                
                # 移除尾部的\r\n
                content = content.rstrip(b'\r\n')
                
                # 解析Content-Disposition
                headers = headers_part.decode('utf-8', errors='ignore')
                
                # 提取name
                name = None
                filename = None
                
                for line in headers.split('\r\n'):
                    if 'Content-Disposition' in line:
                        # 提取name
                        if 'name="' in line:
                            name_start = line.index('name="') + 6
                            name_end = line.index('"', name_start)
                            name = line[name_start:name_end]
                        
                        # 提取filename（如果有）
                        if 'filename="' in line:
                            filename_start = line.index('filename="') + 10
                            filename_end = line.index('"', filename_start)
                            filename = line[filename_start:filename_end]
                
                if name:
                    parts[name] = content
                    if filename:
                        parts['filename'] = filename.encode('utf-8')
        
        return parts


def run_server():
    """启动服务器"""
    try:
        # 创建必要的目录
        os.makedirs(os.path.join(BASE_DIR, 'data'), exist_ok=True)
        os.makedirs(os.path.join(BASE_DIR, 'images'), exist_ok=True)
        
        # 设置处理器
        handler = PhotoWebsiteAPIHandler
        
        # 创建服务器
        with socketserver.TCPServer(("", PORT), handler) as httpd:
            print("=" * 60)
            print(f"摄影网站 API 服务器已启动")
            print(f"监听端口: {PORT}")
            print(f"访问地址: http://localhost:{PORT}")
            print(f"项目目录: {BASE_DIR}")
            print("-" * 60)
            print("可用的API端点:")
            print(f"  - GET  /api/health           健康检查")
            print(f"  - POST /api/save-metadata    保存图片元数据")
            print(f"  - POST /api/upload-image     上传图片")
            print(f"  - POST /api/save-profile     保存个人信息")
            print("=" * 60)
            print("\n按 Ctrl+C 停止服务器\n")
            
            # 启动服务器
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n\n服务器已停止")
        sys.exit(0)
    except OSError as e:
        if e.errno == 10048:  # Windows: 端口已被占用
            print(f"\n错误: 端口 {PORT} 已被占用")
            print("请关闭占用该端口的程序，或修改 PORT 变量使用其他端口")
        else:
            print(f"\n错误: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n启动服务器时发生错误: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    run_server()


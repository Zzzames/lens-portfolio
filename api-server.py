#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
摄影网站Admin工具 - 后端API服务器
提供自动保存元数据的API接口

使用方法：
    python api-server.py

然后访问：
    http://localhost:8000/admin/
"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import os
from urllib.parse import urlparse, parse_qs
import io
import shutil
import re

class AdminAPIHandler(SimpleHTTPRequestHandler):
    
    def send_cors_headers(self):
        """发送CORS头"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    """
    自定义HTTP请求处理器
    支持静态文件服务和API接口
    """
    
    def end_headers(self):
        """添加CORS头，允许跨域请求"""
        self.send_cors_headers()
        super().end_headers()
    
    def do_OPTIONS(self):
        """处理OPTIONS预检请求"""
        self.send_response(200)
        self.end_headers()
    
    def do_POST(self):
        """处理POST请求 - API接口"""
        try:
            parsed_path = urlparse(self.path)
            print(f"[DEBUG] POST请求路径: {parsed_path.path}")
            
            # API: 保存元数据
            if parsed_path.path == '/api/save-metadata':
                self.handle_save_metadata()
            # API: 上传图片
            elif parsed_path.path == '/api/upload-image':
                self.handle_upload_image()
            # API: 保存个人信息
            elif parsed_path.path == '/api/save-profile':
                self.handle_save_profile()
            else:
                print(f"[ERROR] 未知的API路径: {parsed_path.path}")
                self.send_error(404, "API endpoint not found")
        except Exception as e:
            print(f"[ERROR] POST请求处理失败: {e}")
            import traceback
            traceback.print_exc()
            self.send_error(500, f"Internal server error: {str(e)}")
    
    def do_GET(self):
        """处理GET请求 - 静态文件服务"""
        parsed_path = urlparse(self.path)
        
        # 如果是API路径，返回404而不是静态文件
        if parsed_path.path.startswith('/api/'):
            self.send_error(404, "API endpoint not found (use POST method)")
            return
        
        # 使用父类的GET处理（静态文件服务）
        super().do_GET()
    
    def handle_save_metadata(self):
        """
        处理保存元数据的API请求
        POST /api/save-metadata
        """
        print("[DEBUG] 开始处理保存元数据请求")
        try:
            # 读取请求体
            content_length = int(self.headers.get('Content-Length', 0))
            print(f"[DEBUG] Content-Length: {content_length}")
            
            if content_length == 0:
                self.send_json_response(400, {
                    'success': False,
                    'error': '请求体为空'
                })
                return
            
            post_data = self.rfile.read(content_length)
            
            # 解析JSON数据
            metadata = json.loads(post_data.decode('utf-8'))
            
            # 验证数据结构
            if not self.validate_metadata(metadata):
                self.send_json_response(400, {
                    'success': False,
                    'error': '无效的元数据格式'
                })
                return
            
            # 保存到文件
            metadata_file = 'data/site-images-metadata.json'
            
            # 确保目录存在
            os.makedirs('data', exist_ok=True)
            
            # 备份现有文件
            if os.path.exists(metadata_file):
                backup_file = 'data/site-images-metadata.backup.json'
                try:
                    with open(metadata_file, 'r', encoding='utf-8') as f:
                        backup_data = f.read()
                    with open(backup_file, 'w', encoding='utf-8') as f:
                        f.write(backup_data)
                    print(f'✓ 已创建备份: {backup_file}')
                except Exception as e:
                    print(f'警告: 备份失败 - {e}')
            
            # 写入新数据
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            print(f'✓ 元数据已保存: {metadata_file}')
            print(f'  - 版本: {metadata.get("version")}')
            print(f'  - 最后更新: {metadata.get("lastUpdate")}')
            
            # 统计信息
            total_images = sum(len(images) for images in metadata.get('images', {}).values())
            print(f'  - 图片总数: {total_images}')
            
            # 返回成功响应
            self.send_json_response(200, {
                'success': True,
                'message': '元数据已保存',
                'file': metadata_file,
                'totalImages': total_images
            })
            
        except json.JSONDecodeError as e:
            self.send_json_response(400, {
                'success': False,
                'error': f'JSON解析失败: {str(e)}'
            })
        except Exception as e:
            print(f'✗ 保存失败: {e}')
            self.send_json_response(500, {
                'success': False,
                'error': f'保存失败: {str(e)}'
            })
    
    def validate_metadata(self, metadata):
        """
        验证元数据格式
        """
        required_keys = ['version', 'lastUpdate', 'images', 'categories']
        
        # 检查必需字段
        for key in required_keys:
            if key not in metadata:
                print(f'验证失败: 缺少字段 {key}')
                return False
        
        # 检查images是否为字典
        if not isinstance(metadata['images'], dict):
            print('验证失败: images必须是字典')
            return False
        
        # 检查categories是否为字典
        if not isinstance(metadata['categories'], dict):
            print('验证失败: categories必须是字典')
            return False
        
        return True
    
    def handle_upload_image(self):
        """处理图片上传"""
        try:
            print('处理图片上传请求...')
            
            # 获取 Content-Type 和 boundary
            content_type = self.headers.get('Content-Type', '')
            if not content_type.startswith('multipart/form-data'):
                self.send_json_response(400, {
                    'success': False,
                    'error': '错误的 Content-Type'
                })
                return
            
            # 提取 boundary
            boundary_match = re.search(r'boundary=([^;]+)', content_type)
            if not boundary_match:
                self.send_json_response(400, {
                    'success': False,
                    'error': '未找到 boundary'
                })
                return
            
            boundary = boundary_match.group(1).strip()
            
            # 读取请求体
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            # 解析 multipart 数据
            parts = self.parse_multipart(body, boundary)
            
            if 'image' not in parts or 'folder' not in parts:
                self.send_json_response(400, {
                    'success': False,
                    'error': '缺少必要的字段'
                })
                return
            
            image_data = parts['image']['data']
            filename = parts['image']['filename']
            folder = parts['folder']['data'].decode('utf-8')
            
            print(f'  文件名: {filename}')
            print(f'  目标文件夹: {folder}')
            print(f'  文件大小: {len(image_data)} bytes')
            
            # 构建保存路径
            target_dir = os.path.join('images', folder)
            os.makedirs(target_dir, exist_ok=True)
            
            target_path = os.path.join(target_dir, filename)
            
            # 保存文件
            with open(target_path, 'wb') as f:
                f.write(image_data)
            
            print(f'✓ 图片保存成功: {target_path}')
            
            self.send_json_response(200, {
                'success': True,
                'message': '图片上传成功',
                'path': target_path
            })
            
        except Exception as e:
            print(f'✗ 图片上传失败: {e}')
            import traceback
            traceback.print_exc()
            self.send_json_response(500, {
                'success': False,
                'error': str(e)
            })
    
    def parse_multipart(self, body, boundary):
        """解析 multipart/form-data"""
        parts = {}
        boundary_bytes = ('--' + boundary).encode()
        
        # 分割各个部分
        sections = body.split(boundary_bytes)
        
        for section in sections:
            if not section or section == b'--\r\n' or section == b'--':
                continue
            
            # 分离头部和数据
            if b'\r\n\r\n' not in section:
                continue
            
            header_end = section.find(b'\r\n\r\n')
            headers = section[:header_end].decode('utf-8', errors='ignore')
            data = section[header_end + 4:]
            
            # 移除尾部的 \r\n
            if data.endswith(b'\r\n'):
                data = data[:-2]
            
            # 解析 Content-Disposition
            name_match = re.search(r'name="([^"]+)"', headers)
            if not name_match:
                continue
            
            name = name_match.group(1)
            
            # 检查是否是文件
            filename_match = re.search(r'filename="([^"]+)"', headers)
            
            if filename_match:
                # 文件字段
                parts[name] = {
                    'filename': filename_match.group(1),
                    'data': data
                }
            else:
                # 普通字段
                parts[name] = {
                    'data': data
                }
        
        return parts
    
    def handle_save_profile(self):
        """处理保存个人信息"""
        try:
            print('处理保存个人信息请求...')
            
            # 读取请求体
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            
            # 解析JSON
            profile_data = json.loads(body.decode('utf-8'))
            
            print(f'  姓名: {profile_data.get("name")}')
            
            # 修正 Logo 路径：将 ./images/ 转换为 ../images/
            if 'logos' in profile_data and isinstance(profile_data['logos'], list):
                for logo in profile_data['logos']:
                    if 'src' in logo:
                        logo_src = logo['src']
                        if logo_src.startswith('./images/admin-images/'):
                            logo['src'] = logo_src.replace('./images/admin-images/', '../images/')
                        elif logo_src.startswith('./images/'):
                            logo['src'] = logo_src.replace('./images/', '../images/')
                        print(f"  Logo: {logo.get('name')} -> {logo['src']}")
            
            # 保存到文件
            profile_file = 'data/profile-data.json'
            os.makedirs('data', exist_ok=True)
            
            # 备份现有文件
            if os.path.exists(profile_file):
                backup_file = 'data/profile-data.backup.json'
                try:
                    with open(profile_file, 'r', encoding='utf-8') as f:
                        backup_data = f.read()
                    with open(backup_file, 'w', encoding='utf-8') as f:
                        f.write(backup_data)
                    print(f'✓ 已创建备份: {backup_file}')
                except Exception as e:
                    print(f'警告: 备份失败 - {e}')
            
            # 写入新数据
            with open(profile_file, 'w', encoding='utf-8') as f:
                json.dump(profile_data, f, ensure_ascii=False, indent=2)
            
            print(f'✓ 个人信息已保存: {profile_file}')
            
            self.send_json_response(200, {
                'success': True,
                'message': '个人信息已保存',
                'file': profile_file
            })
            
        except Exception as e:
            print(f'✗ 保存个人信息失败: {e}')
            import traceback
            traceback.print_exc()
            self.send_json_response(500, {
                'success': False,
                'error': str(e)
            })
    
    def send_json_response(self, status_code, data):
        """
        发送JSON响应
        """
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_cors_headers()
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()
        
        response = json.dumps(data, ensure_ascii=False, indent=2)
        self.wfile.write(response.encode('utf-8'))
    
    def log_message(self, format, *args):
        """
        自定义日志格式
        """
        # 只记录API请求，静态文件请求不记录（减少噪音）
        if '/api/' in self.path or self.command == 'POST':
            print(f"[{self.command}] {self.path} - {args[1]}")
        # 不记录404，避免日志污染
        elif '404' not in str(args):
            # 其他重要请求记录
            pass


def run_server(port=8000):
    """
    启动HTTP服务器
    """
    server_address = ('', port)
    httpd = HTTPServer(server_address, AdminAPIHandler)
    
    print('=' * 60)
    print('🚀 摄影网站Admin工具 - API服务器')
    print('=' * 60)
    print(f'\n✓ 服务器已启动: http://localhost:{port}')
    print(f'✓ Admin工具地址: http://localhost:{port}/admin/')
    print(f'✓ API端点:')
    print(f'    - /api/save-metadata (保存图片元数据)')
    print(f'    - /api/upload-image (上传图片)')
    print(f'    - /api/save-profile (保存个人信息)')
    print('\n功能：')
    print('  - 静态文件服务（整个网站）')
    print('  - 自动保存元数据API')
    print('  - 图片上传API')
    print('  - 自动备份功能')
    print('\n按 Ctrl+C 停止服务器')
    print('=' * 60)
    print()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print('\n\n服务器已停止')
        httpd.shutdown()


if __name__ == '__main__':
    import sys
    
    # 允许自定义端口
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f'错误: 端口号必须是数字')
            sys.exit(1)
    
    run_server(port)


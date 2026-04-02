#!/bin/bash
set -e

echo "=== 部署招生 Agent 系统 ==="

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "错误: Docker 未安装"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "错误: Docker Compose 未安装"
    exit 1
fi

# 检查 .env 文件
if [ ! -f "../.env" ]; then
    echo "警告: .env 文件不存在，创建示例文件..."
    if [ -f ".env.production.example" ]; then
        cp .env.production.example ../.env
        echo "已创建 .env，请编辑后重新运行部署脚本"
        exit 1
    else
        echo "错误: 找不到 .env 或 .env.production.example"
        exit 1
    fi
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "正在构建镜像..."
docker compose -f docker-compose.yml build --no-cache

echo "正在启动服务..."
docker compose -f docker-compose.yml up -d

echo "等待服务启动..."
sleep 10

echo "检查服务状态..."
if curl -sf http://localhost:8000/health > /dev/null; then
    echo "✓ 后端服务正常"
else
    echo "✗ 后端服务启动失败"
    docker compose -f docker-compose.yml logs
    exit 1
fi

echo ""
echo "=== 部署成功 ==="
echo "访问地址:"
echo "  后端 API: http://localhost:8000"
echo "  前端控制台: http://localhost:8000/console/"
echo "  健康检查: http://localhost:8000/health"
echo ""
echo "查看日志: docker compose -f deploy/docker-compose.yml logs -f"
echo "停止服务: docker compose -f deploy/docker-compose.yml down"

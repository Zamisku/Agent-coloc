# 大学招生门户智能问答 Agent 系统

面向考生和家长的招生信息问答系统，基于 LangGraph 状态机编排的 RAG + LLM Agent，支持流式回复、动态配置管理和多业务域扩展。

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户                                            │
│                     （考生、家长、招生咨询）                                   │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         前端控制台 (React 18)                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐    │
│  │ 对话测试  │  │ 模型管理  │  │  系统监控  │  │ Prompt   │  │   系统设置    │    │
│  │ /console │  │/console  │  │/console   │  │/console  │  │  /console    │    │
│  │   /chat  │  │/models   │  │/monitor   │  │/prompts  │  │  /settings  │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────┘    │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │ HTTP / SSE
                               ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                      FastAPI 后端 (Python 3.11)                               │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         LangGraph Agent                                │   │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐ │   │
│  │  │Classifier│──▶│ Rewriter │──▶│Retriever│──▶│Evaluator│──▶│Generator│ │   │
│  │  │ 意图分类  │   │ 查询改写  │   │ RAG 检索  │   │ 质量评估  │   │ 答案生成  │ │   │
│  │  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ LLM Client  │  │ RAG Client  │  │   Memory    │  │  ConfigManager      │  │
│  │  (OpenAI)   │  │  (Mock)     │  │  (Redis)    │  │  (Redis + .env)     │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
   │    Redis    │      │  OpenAI API │      │ RAG Service │
   │  (会话存储)  │      │   (LLM)     │      │  (Mock)     │
   └─────────────┘      └─────────────┘      └─────────────┘
```

---

## 配置管理

### 概述

系统采用**基于 Redis 的动态配置机制**，配置分层管理：

1. **首次部署**：通过 `.env` 文件挂载到容器，初始化 Redis 中的默认配置
2. **运行时热更新**：通过前端 Web 界面实时修改，无需重启服务

### 配置来源优先级

```
前端界面修改（最高优先级）
        ↓
  Redis 运行时配置
        ↓
  .env 文件默认值
        ↓
  CONFIG_SCHEMA 内置默认值（最低优先级）
```

### .env 配置项

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `OPENAI_API_KEY` | OpenAI API 密钥 | - |
| `OPENAI_MODEL` | 模型名称 | `gpt-4o` |
| `OPENAI_BASE_URL` | API 地址 | `https://api.openai.com/v1` |
| `APP_ENV` | 运行环境 | `dev` |
| `REDIS_URL` | Redis 连接地址 | `redis://localhost:6379/0` |
| `MEMORY_MAX_ROUNDS` | 最大对话轮数 | `10` |
| `MEMORY_TTL` | 会话过期时间(秒) | `3600` |
| `RAG_MOCK_ENABLED` | Mock 模式 | `true` |
| `RAG_TOP_K` | 检索数量 | `5` |
| `RAG_RELEVANCE_THRESHOLD` | 相关性阈值 | `0.6` |

---

## 本地开发

### 环境要求

- Python 3.11+
- Node.js 18+
- Redis 6+
- Docker & Docker Compose（用于启动 Redis）

### 安装依赖

```bash
# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .\.venv\\Scripts\\activate  # Windows

# 安装后端依赖
pip install -r requirements.txt

# 安装前端依赖
cd frontend
npm install
```

### 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入必要的配置（OPENAI_API_KEY 等）
```

### 启动服务

```bash
# 启动 Redis（Docker）
docker run -d -p 6379:6379 redis:latest

# 启动后端
uvicorn app.main:app --reload --port 8000

# 新终端：启动前端开发服务器
cd frontend
npm run dev
```

### 运行测试

```bash
# 后端 API 测试
pytest app/tests/ -v

# 前端构建测试
cd frontend && npm run build
```

---

## 服务器部署

### 一键部署

```bash
# 1. 克隆代码
git clone <repository-url>
cd <project-directory>

# 2. 配置环境变量
cp deploy/.env.production.example .env
# 编辑 .env，填入生产环境配置

# 3. 执行部署脚本
cd deploy
chmod +x deploy.sh
./deploy.sh
```

### 部署脚本流程

1. 检查 Docker 和 Docker Compose
2. 验证 `.env` 文件存在
3. 构建 Docker 镜像
4. 启动容器（FastAPI + Redis）
5. 健康检查

### 访问地址

- 后端 API：http://localhost:8000
- 前端控制台：http://localhost:8000/console/
- 健康检查：http://localhost:8000/health
- API 文档：http://localhost:8000/docs

### 运维命令

```bash
# 查看日志
docker compose -f deploy/docker-compose.yml logs -f

# 停止服务
docker compose -f deploy/docker-compose.yml down

# 重启服务
docker compose -f deploy/docker-compose.yml restart
```

---

## API 文档

### 基础信息

- Base URL: `http://localhost:8000`
- 所有 API 均返回 JSON
- 流式接口使用 Server-Sent Events (SSE)

---

### Chat 接口

#### POST `/api/chat` - 同步对话

**请求体：**
```json
{
  "message": "今年的理科分数线是多少？",
  "session_id": "可选的会话ID"
}
```

**响应：**
```json
{
  "session_id": "abc123",
  "reply": "根据2024年招生数据，理科本科一批分数线为...",
  "sources": [
    {
      "content": "【分数线】2024年理科本科一批...",
      "score": 0.92,
      "source": "招生办公室"
    }
  ],
  "intent": "score_query",
  "debug": {
    "intent": "score_query",
    "domain": "admission",
    "rewritten_query": "2024年理科本科一批分数线",
    "retrieval_quality": "sufficient",
    "top_relevance_score": 0.92,
    "latency_ms": 1234
  }
}
```

---

#### POST `/api/chat/stream` - 流式对话

**请求体：** 同 `/api/chat`

**响应 (SSE)：**
```
event: message
data: 今
event: message
data: 年
event: message
data: 的
...（逐字返回）
event: debug
data: {"intent": "score_query", "domain": "admission", ...}
event: done
data:
```

---

### 模型管理接口

#### GET `/api/models` - 获取可用模型列表

**响应：**
```json
{
  "models": [
    {"id": "gpt-4o", "name": "GPT-4o", "provider": "openai", "description": "最强推理能力"},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "openai", "description": "快速经济"},
    {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo", "provider": "openai", "description": "基础能力"},
    {"id": "custom", "name": "自建模型", "provider": "custom", "description": "自建推理服务"}
  ]
}
```

---

#### GET `/api/models/current` - 获取当前模型

**响应：**
```json
{"current": "gpt-4o"}
```

---

#### PUT `/api/models/current` - 切换当前模型

**请求体：**
```json
{"model_id": "gpt-4o-mini"}
```

**响应：**
```json
{"current": "gpt-4o-mini"}
```

---

### 监控接口

#### GET `/api/monitor/stats` - 获取统计数据

**响应：**
```json
{
  "stats": {
    "today_requests": 1523,
    "avg_latency_ms": 1245,
    "error_rate": 0.002,
    "uptime_seconds": 86400,
    "hourly_requests": [
      {"hour": "09:00", "count": 120},
      {"hour": "10:00", "count": 245}
    ],
    "intent_distribution": {
      "score_query": 450,
      "major_query": 320,
      "policy_query": 280
    }
  }
}
```

---

#### GET `/api/monitor/logs` - 获取请求日志

**查询参数：**
- `limit`: 返回数量（默认 50）
- `intent`: 按意图过滤（可选）

**响应：**
```json
{
  "logs": [
    {
      "session_id": "abc123",
      "user_query": "理科分数线",
      "intent": "score_query",
      "domain": "admission",
      "response_text": "根据2024年...",
      "total_latency_ms": 1234,
      "timestamp": "2024-01-15T10:30:00"
    }
  ]
}
```

---

#### GET `/api/monitor/health` - 健康检查

**响应：**
```json
{
  "status": "ok",
  "components": {
    "redis": "ok",
    "openai": "ok"
  }
}
```

---

### Prompt 管理接口

#### GET `/api/prompts` - 获取所有 Prompt 模板

**响应：**
```json
{
  "prompts": [
    {"name": "classifier", "system_prompt": "...", "user_template": "..."},
    {"name": "rewriter", "system_prompt": "...", "user_template": "..."},
    {"name": "generator", "system_prompt": "...", "user_template": "..."}
  ]
}
```

---

#### GET `/api/prompts/{name}` - 获取指定 Prompt

---

#### PUT `/api/prompts/{name}` - 更新 Prompt 模板

**请求体：**
```json
{
  "system_prompt": "你是一个招生咨询助手...",
  "user_template": "用户问题: {query}\n上下文: {context}"
}
```

---

#### GET `/api/prompts/history/{name}` - 获取版本历史

---

#### POST `/api/prompts/{name}/test` - 测试 Prompt

**请求体：**
```json
{"test_input": "今年的分数线是多少？"}
```

---

### 系统设置接口

#### GET `/api/settings` - 获取所有配置

**响应：**
```json
{
  "settings": {
    "OPENAI_API_KEY": "sk-...xxxx",
    "OPENAI_MODEL": "gpt-4o",
    ...
  }
}
```

---

#### PUT `/api/settings` - 批量更新配置

**请求体：**
```json
{
  "OPENAI_MODEL": "gpt-4o-mini",
  "RAG_TOP_K": "10"
}
```

---

#### PUT `/api/settings/{key}` - 更新单个配置

---

#### GET `/api/settings/schema` - 获取配置Schema

---

#### GET `/api/settings/history` - 获取配置变更历史

---

#### POST `/api/settings/reset` - 重置为默认值

---

## 前端页面

### 1. 对话测试页面 (`/console/chat`)

核心对话界面，支持：
- 发送消息并接收流式回复
- 右侧调试面板显示：
  - 意图分类结果 (intent)
  - 领域 (domain)
  - 改写后查询 (rewritten_query)
  - 检索质量 (retrieval_quality)
  - 相关性得分 (top_relevance_score)
  - 响应延迟 (latency_ms)
- 新建对话（清空当前会话）
- 实时显示/隐藏调试信息

---

### 2. 模型管理页面 (`/console/models`)

模型切换与管理界面：
- 展示所有可用模型卡片
- 显示当前选中模型
- 一键切换模型（需确认）
- 显示各模型今日请求量
- 支持自定义模型配置（base_url + model_name）

---

### 3. 系统监控页面 (`/console/monitor`)

系统运行状态监控：
- 统计卡片：今日请求量、平均延迟、错误率、运行时间
- 请求量趋势图（按小时）
- 意图分布饼图
- 请求日志表格（支持按意图过滤）
- 自动刷新开关（10秒间隔）
- 实时刷新按钮

---

### 4. Prompt 管理页面 (`/console/prompts`)

Prompt 模板编辑与测试：
- 左侧：Prompt 选择器（classifier / rewriter / generator）
- 中间：System Prompt 和 User Template 编辑器
- 右侧：测试面板（输入测试文本，查看结构化结果）
- 功能按钮：保存、重置、查看历史
- 版本历史弹窗：查看历史版本，支持回滚

---

### 5. 系统设置页面 (`/console/settings`)

运行时配置管理：
- 分组展示配置项（LLM配置、RAG配置、对话配置、基础设施、系统配置）
- 支持类型：text、number、boolean、select、url、secret
- 实时变更检测（底部浮动保存栏）
- 配置变更历史记录
- 一键重置为默认值

---

## 扩展指南

### 新增业务域

1. 在 `app/agent/domains/` 下创建新目录，如 `academic/`
2. 实现领域特定的节点和规则
3. 在 `app/config.py` 的 `ENABLED_DOMAINS` 中添加新域
4. 在 `app/agent/graph.py` 中注册新域的节点

示例目录结构：
```
app/agent/domains/academic/
├── __init__.py
├── nodes/
│   ├── __init__.py
│   └── ...
└── prompts/
    └── ...
```

---

### 新增渠道

当前适配器 `WebAdapter` 将 Web 请求转为 `UnifiedMessage`。

新增渠道（如微信、企业微信）：

1. 在 `app/adapters/` 下创建新适配器，如 `wechat.py`
2. 实现 `to_unified()` 方法将渠道特定格式转为 `UnifiedMessage`
3. 在 `app/api/` 下创建对应路由
4. 适配器不感知业务逻辑，保持职责单一

---

### 对接真实 RAG 服务

当前为 Mock 模式，对接真实 RAG：

1. 修改 `app/services/rag_client.py`
2. 实现 `retrieve()` 方法，调用真实 RAG API
3. 将 `RAG_MOCK_ENABLED` 设为 `false`
4. 配置 `RAG_BASE_URL` 为真实服务地址

主要改动：
```python
# app/services/rag_client.py
async def retrieve(self, query: str, top_k: int) -> list[dict]:
    if config_manager.get_bool("RAG_MOCK_ENABLED"):
        return self._mock_retrieve(query, top_k)

    # 调用真实 RAG 服务
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{config_manager.get('RAG_BASE_URL')}/retrieve",
            json={"query": query, "top_k": top_k}
        )
        return response.json()["results"]
```

---

### 切换自建 LLM

当前使用 OpenAI GPT-4o，切换自建模型：

1. **部署自建推理服务**（如 vLLM、Text Generation Inference）
2. **修改配置**：
   - `OPENAI_BASE_URL`: 设为自建服务地址
   - `OPENAI_MODEL`: 设为部署的模型名
   - `OPENAI_API_KEY`: 设为自建服务的密钥
3. **更新 Model 模型**（可选）：在 `app/api/admin.py` 的 `MODELS` 列表中添加自定义模型项

确保自建服务兼容 OpenAI API 格式。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | FastAPI + LangGraph |
| 异步 HTTP | httpx |
| LLM SDK | OpenAI Python SDK |
| 状态管理 | Redis (对话记忆) |
| 验证 | Pydantic v2 |
| 日志 | structlog |
| 前端框架 | React 18 + TypeScript |
| 前端状态 | Zustand |
| 图表 | Recharts |
| 样式 | TailwindCSS |
| 构建 | Vite |
| 部署 | Docker Compose |

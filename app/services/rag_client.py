from typing import Optional

import httpx

from app.models.schemas import RetrievedDoc, RetrievalResult, DomainType
from app.services.config_manager import config_manager


class RAGClient:
    def _get_mock_result(self, query: str, domain: str) -> RetrievalResult:
        q = query.lower()
        if "分数" in q or "录取" in q:
            docs = [
                RetrievedDoc(
                    content="2024年本科一批理科录取分数线：河南省 582分，四川省 568分，广东省 555分。",
                    score=0.85,
                    source="招生办官网",
                    metadata={"type": "score", "year": 2024},
                ),
                RetrievedDoc(
                    content="2024年文科录取分数线：河南省 568分，四川省 552分，广东省 538分。",
                    score=0.72,
                    source="招生简章",
                    metadata={"type": "score", "year": 2024},
                ),
            ]
        elif "专业" in q:
            docs = [
                RetrievedDoc(
                    content="计算机科学与技术专业：国家级一流本科专业，首批通过工程教育认证。近三年就业率98%，平均年薪约28万元。",
                    score=0.88,
                    source="专业介绍",
                    metadata={"department": "计算机学院"},
                ),
                RetrievedDoc(
                    content="人工智能专业：2024年新增专业，培养AI算法研究与工程应用人才。师资力量雄厚，含3位IEEE Fellow。",
                    score=0.75,
                    source="专业介绍",
                    metadata={"department": "人工智能学院"},
                ),
            ]
        elif "宿舍" in q or "食堂" in q or "校园" in q:
            docs = [
                RetrievedDoc(
                    content="学生宿舍：四人间为主，上床下桌，配空调、热水器。宿舍楼每层设有自习室和洗衣房。新生宿舍费1200-1800元/年。",
                    score=0.82,
                    source="学生手册",
                    metadata={"category": "campus_life"},
                ),
                RetrievedDoc(
                    content="学校共有7个食堂，涵盖川菜、湘菜、粤菜、面食、西餐等风味窗口。学生月均伙食费约800-1200元。",
                    score=0.70,
                    source="后勤集团",
                    metadata={"category": "campus_life"},
                ),
            ]
        elif "报名" in q or "志愿" in q or "流程" in q:
            docs = [
                RetrievedDoc(
                    content="高考志愿填报流程：1. 考生登录省考试院志愿填报系统；2. 自主选择院校和专业志愿；3. 确认提交前可修改2次；4. 录取结果一般在7个工作日内公布。",
                    score=0.85,
                    source="招生简章",
                    metadata={"type": "process"},
                ),
                RetrievedDoc(
                    content="学校代码：XXXXX（具体以各省招生计划为准）。建议考生参考往年录取位次，合理填报志愿梯度。",
                    score=0.68,
                    source="招生办官网",
                    metadata={"type": "policy"},
                ),
            ]
        else:
            docs = [
                RetrievedDoc(
                    content="XX大学是一所以工为主、多学科协调发展的综合性大学。学校现有在校生3.5万余人，专任教师2000余人，拥有12个博士点、38个硕士点。",
                    score=0.80,
                    source="学校概况",
                    metadata={"category": "overview"},
                ),
                RetrievedDoc(
                    content="学校地址：XX省XX市XX路XX号。招生咨询电话：XXXX-XXXXXXXX。",
                    score=0.60,
                    source="招生办官网",
                    metadata={"category": "contact"},
                ),
            ]
        return RetrievalResult(query=query, documents=docs, domain=DomainType(domain))

    async def retrieve(
        self,
        query: str,
        domain: str = "admission",
        top_k: Optional[int] = None,
    ) -> RetrievalResult:
        mock_enabled = config_manager.get_bool("RAG_MOCK_ENABLED")

        if mock_enabled:
            return self._get_mock_result(query, domain)

        base_url = config_manager.get("RAG_BASE_URL") or "http://localhost:8081/api"
        effective_top_k = top_k if top_k is not None else config_manager.get_int("RAG_TOP_K")
        timeout = config_manager.get_int("RAG_TIMEOUT")

        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                f"{base_url}/retrieve",
                json={"query": query, "domain": domain, "top_k": effective_top_k},
            )
            response.raise_for_status()
            data = response.json()
            return RetrievalResult(**data)


rag_client = RAGClient()

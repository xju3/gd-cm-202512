import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.data_service import get_work_orders
from app.main import app


client = TestClient(app)


class TestWorkOrdersService:
    """测试工单列表service方法"""

    def test_get_work_orders_without_keyword(self):
        """
        测试没有keyword的查询，skip=0, limit=10
        注意：这里使用真实数据库数据
        """
        # 获取数据库会话
        db_gen = get_db()
        db = next(db_gen)
        
        try:
            # 直接调用service方法
            total, items = get_work_orders(
                db=db,
                skip=0,  # page=1 对应 skip=0
                limit=10,  # size=10
                keyword=""  # 无keyword
            )
            
            # 验证返回结果
            assert total >= 0  # 总记录数应该非负
            assert isinstance(items, list)
            
            # 验证分页逻辑
            if total > 0:
                assert len(items) <= 10  # 不超过limit
                
                # 验证工单数据结构
                for item in items:
                    assert hasattr(item, 'work_order_id')
                    assert hasattr(item, 'GJ00008')
                    # 根据service中的查询条件，GJ00008应该包含"退服"
                    assert "退服" in item.GJ00008
                    
            print(f"无keyword查询测试通过: total={total}, items={len(items)}")
            
        finally:
            try:
                next(db_gen)  # 触发finally中的db.close()
            except StopIteration:
                pass

    def test_get_work_orders_with_keyword(self):
        """
        测试带keyword的查询，keyword为20250626
        注意：这里使用真实数据库数据
        """
        # 获取数据库会话
        db_gen = get_db()
        db = next(db_gen)
        
        try:
            # 直接调用service方法，keyword为20250626
            total, items = get_work_orders(
                db=db,
                skip=0,  # page=1 对应 skip=0
                limit=10,  # size=10
                keyword="20250626"  # 指定keyword
            )
            
            # 验证返回结果
            assert total >= 0  # 总记录数应该非负
            assert isinstance(items, list)
            
            # 验证分页逻辑
            if total > 0:
                assert len(items) <= 10  # 不超过limit
                
                # 验证工单数据包含keyword
                for item in items:
                    assert hasattr(item, 'work_order_id')
                    assert hasattr(item, 'GJ00008')
                    # 根据service中的查询条件，GJ00008应该包含"退服"
                    assert "退服" in item.GJ00008
                    # work_order_id应该包含keyword
                    assert "20250626" in item.work_order_id
                    
            print(f"带keyword查询测试通过: total={total}, items={len(items)}")
            
        finally:
            try:
                next(db_gen)  # 触发finally中的db.close()
            except StopIteration:
                pass

    def test_get_work_orders_pagination(self):
        """
        测试分页功能
        """
        # 获取数据库会话
        db_gen = get_db()
        db = next(db_gen)
        
        try:
            # 第一页
            total1, items1 = get_work_orders(db=db, skip=0, limit=5)
            
            # 第二页
            total2, items2 = get_work_orders(db=db, skip=5, limit=5)
            
            # 总记录数应该相同
            assert total1 == total2
            
            # 如果数据足够多，两页的数据应该不同
            if total1 > 5:
                assert len(items1) == 5
                assert len(items2) == 5
                # 检查是否有重复（简单检查第一个元素）
                if items1 and items2:
                    assert items1[0].work_order_id != items2[0].work_order_id
                    
            print(f"分页测试通过: total={total1}")
            
        finally:
            try:
                next(db_gen)  # 触发finally中的db.close()
            except StopIteration:
                pass


class TestWorkOrdersAPI:
    """测试工单列表API接口"""
    
    def test_api_get_work_orders_without_keyword(self):
        """
        测试API接口：没有keyword的查询，page=1, size=10
        使用真实数据库
        """
        response = client.get(
            "/api/v1/work-orders",
            params={"page": 1, "size": 10}
        )
        
        # 验证响应
        assert response.status_code == 200
        data = response.json()
        
        # 验证分页结构
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert "total_pages" in data
        assert "items" in data
        
        # 验证具体值
        assert data["page"] == 1
        assert data["size"] == 10
        
        print(f"API无keyword查询测试通过: total={data['total']}, items={len(data['items'])}")
    
    def test_api_get_work_orders_with_keyword(self):
        """
        测试API接口：带keyword的查询，keyword为20250626
        使用真实数据库
        """
        response = client.get(
            "/api/v1/work-orders",
            params={"page": 1, "size": 10, "keyword": "20250626"}
        )
        
        # 验证响应
        assert response.status_code == 200
        data = response.json()
        
        # 验证分页结构
        assert "total" in data
        assert "page" in data
        assert "size" in data
        assert "total_pages" in data
        assert "items" in data
        
        # 验证具体值
        assert data["page"] == 1
        assert data["size"] == 10
        
        # 如果有关键字匹配的结果，验证工单ID包含关键字
        if data["items"]:
            for item in data["items"]:
                assert "20250626" in item["work_order_id"]
                
        print(f"API带keyword查询测试通过: total={data['total']}, items={len(data['items'])}")
    
    def test_api_get_work_orders_validation(self):
        """
        测试API参数验证
        """
        # 测试无效页码
        response = client.get(
            "/api/v1/work-orders",
            params={"page": 0, "size": 10}
        )
        assert response.status_code == 422
        
        # 测试无效每页大小
        response = client.get(
            "/api/v1/work-orders",
            params={"page": 1, "size": 0}
        )
        assert response.status_code == 422
        
        # 测试每页大小超过最大值
        response = client.get(
            "/api/v1/work-orders",
            params={"page": 1, "size": 101}
        )
        assert response.status_code == 422
        
        print("API参数验证测试通过")

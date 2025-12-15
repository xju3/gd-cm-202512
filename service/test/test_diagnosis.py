import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.data_service import exec
from app.main import app
from typing import List


client = TestClient(app)

class WorkOrderDianosisParamAndExpections:
    work_order_id: str
    rule_id : int
    error_index: int
    conclustion: str
    solution_code : str

class WorkOrderDianosisTestService:
    """测试工单列表service方法"""

    def tf001_givenAllRules_whenRunDiagnosisForEach_thenEachResultSatisfiedCorrespondingExpectations(self):
        work_order_id = 'CMCC-GD-GZCL-20250515-008248'  # 基站退服
        params = List[WorkOrderDianosisParamAndExpections]
        # 规则1,2,3
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 1, 1, "市电电力故障", "FA00005"))
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 2, 1, "整流模块故障", "FA00006"))
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 3, 1, "市电电力故障", "FA00005"))      
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 3, 2, "整流模块故障", "FA00006"))    
        # 规则4,5,6,7,8,9
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 4, 1, "传输光缆故障", "FA00013"))      
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 5, 1, "传输光缆故障", "FA00013"))      
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 6, 1, "PTN/SPN至BBU端故障（PTN/SPN板件、端口；机房内尾纤；传输光缆；BBU端主控板、光模块）", "FA00017"))      
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 7, 2, "光模块、尾纤、传输故障", "FA00007"))      
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 8, 3, "时钟盒/GPS故障", "FA00014"))      
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 9, 4, "BBU侧设备故障", "FA00015"))      
        self._exec(params)

    def tf002_givenAllRules_whenRunDiagnosisForEach_thenEachResultsSatisfiedCorrespondingExpectations(self):
        work_order_id = 'CMCC-GD-GZCL-20250429-009158' # 小区退服
        params = List[WorkOrderDianosisParamAndExpections]
        # 规则1,2,3
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 1, 1, "市电电力故障", "FA00005"))
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 2, 1, "整流模块故障", "FA00006"))
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 3, 1, "市电电力故障", "FA00005"))      
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 3, 2, "整流模块故障", "FA00006"))      
        # 规则4,5
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 4, 1, "LICENSE资源不足", "FA00008"))      
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 4, 2, "频点配置错误", "FA00009"))      
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 4, 3, "功率配置错误", "FA00010"))      
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 4, 4, "基带单元能力不足", "FA00011"))      
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 4, 5, "基带板件故障", "FA00012"))      
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 5, 2, "光模块、尾纤、传输故障", "FA00007"))      
        params.append(WorkOrderDianosisParamAndExpections(work_order_id, 5, 5, "RRU端故障", "FA00001"))      
        self._exec(params)
    

    def _exec(self, params: List[WorkOrderDianosisParamAndExpections]):
        # 获取数据库会话
        db_gen = get_db()
        db = next(db_gen)
        
        for param in params:
            results= exec(db, param.work_order_id, param.rule_id, param.error_index)
            assert len(results) == param.rule_id 
            item = results[param.rule_id - 1]
            assert item.conclusion == param.conclustion
            assert item.solution_code == param.solution_code
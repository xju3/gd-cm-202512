import { Alert } from "../types";

export interface WorkOrderDetails {
  告警网管: string;
  告警地点: string;
  告警时间: string;
  告警网元: string;
  告警名称: string;
  告警原文: string;
  覆盖场景: string;
}

export interface WorkOrderItem {
  work_order_id: string;
  GJ00008: string; // Title/Type
  GJ00010: string; // Location
  GJ00011: string; // Vendor
  GJ00014: string; // NE Name
  GJ00017: string; // Network Type
  GJ00021: string | null;
  created_time: string;
  source_name: string;
  order_subject: string;
  order_status: string;
  city_name_1: string;
  city_name_2: string;
  ne_name: string;
  nms_alarm_id: string;
  warning_level: string;
  current_owner_role: string | null;
  dispatcher_profession: string | null;
  alarm_nms_source: string | null;
  process_region: string;
  network_level_3: string;
  is_device_reason: string | null;
  order_level: string | null;
  details: WorkOrderDetails;
  fault_impact_range?: string;
}

export interface WorkOrderResponse {
  total: number;
  page: number;
  size: number;
  total_pages: number;
  items: WorkOrderItem[];
}

export interface DiagnosisItem {
  name: string;
  descriptions: string;
  conclusion: string;
  curr_rules: string[];
  solution_content: string;
  solution_code: string;
  processes?: string[];
  fault_impact_range?: string;
}

export interface DiagnosisResponse {
  success: boolean;
  error: string;
  data: DiagnosisItem[];
}

const FA00001_SOLUTION = `# 更换RRU

## 提前准备
* 1、***备件准备:*** 通过后台网管查询原 “RRU 的型号全称、序列号及配置参数（如支持频段、光模块速率、最大输出功率）”，确保新 RRU 在上述参数及硬件形态（安装孔位、尺寸）上完全匹配；同时核查配套光模块的型号、速率、波长与原配置一致。
* 2、***工具准备:*** 准备螺丝刀（含绝缘柄）、扳手（配套不同规格）、防失手绳（承重≥50kg）、防水胶泥（通信专用）、防水胶布（耐候型，宽度≥25mm）、光模块专用拔插工具（带防静电保护）、记号笔、扎带等工具。
* 3、***进站沟通:*** 与站点接口人“李生（134xxxxxxx6）”提前 2 小时再次确认进站时间，根据作业场景（如高空作业、机房内操作）预留 1.5-2 小时操作窗口（含业务中断缓冲及验证时间），书面告知作业内容、预计影响范围及时长（如 “计划中断 XX 小区业务 30 分钟”）。
* 4、***安全准备:***
    * （1）操作人员需持有效且在有效期内的电工证（涉及电源操作）和登高证（铁塔 / 抱杆安装场景）；
    * （2）配备安全防护用品：绝缘梯、绝缘手套及绝缘鞋（耐压≥1000V，在有效期内）、安全帽（在有效期内）、双钩安全带（承重≥15kN，配备缓冲器）、数字验电笔（支持12V-220V）、反光衣、急救包（含止血带、碘伏等基础用品）；
    * （3）作业前开展安全技术交底，明确风险点（如高空坠落、触电、设备坠落）及应急措施（如触电急救流程、高空救援方案）。
* 5、***校验确认关键指标***
    * （1）光模块发送功率、接收功率（精确至 0.1dBm）；
    * （2）驻波比（小区级 / 载波级，精确至 0.01）；
    * （3）当前告警状态（含告警 ID、发生时间、告警级别）；
    * 作为后续恢复验证的基准。
## 现场操作

1. 站点进站  
   到达现场后，与接口人共同确认进站，签署《基站出入登记单》（注明进场时间、作业人员姓名），通过站点图纸或接口人指引明确 RRU 安装位置（机房内机架 / 室外抱杆 / 铁塔平台）及周边环境（如是否有遮挡、是否需协调周边施工方）。

2. 设备定位及更换前操作  
   1. 通知后台通过网管截图目标 RRU 的详细信息（型号、序列号、光模块参数、实时运行指标）并存档；  
   2. 由后台执行小区去激活操作（非直接断电），确认业务中断（语音 / 数据业务均不可用），避免热插拔导致光模块损坏；  
   3. 现场使用光功率计复测 RRU 光口接收功率（与网管值偏差≤1dB 为正常），记录数值。

3. 安全操作准备  
   1. 绝缘梯使用：作业前检查梯体无变形、裂纹，梯脚防滑垫完好，放置于平整硬地面并采取防倾倒措施（如梯脚绑沙袋），需 1 名专人扶梯（扶梯人员需佩戴安全帽，禁止在梯上人员作业时移动梯子）；  
   2. 登高作业：仅持有效登高证人员可上杆 / 上塔作业，登高前检查双钩安全带无破损、缝线牢固、卡扣灵活，且在试验有效期内；上杆后双钩需分别绑定不同稳固构件（如铁塔横担、抱杆加强筋），移动时保持至少 1 个挂钩处于有效受力状态，禁止单钩作业。器件通过工具包传递（禁止徒手携带）。

4. 拆除旧 RRU  
   1. 断开 RRU 对应的电源接头或空开（记录空开编号），在电源接头或空开处悬挂 “正在作业，禁止合闸” 警示牌，等待 60 秒确保设备电容完全放电（部分大功率 RRU 需延长至 2 分钟，参照设备手册）；  
   2. 用数字验电笔检测电源接口正负极，确认无电压（≤12V 为安全）后，拆除电源连接线（做好正负极标记）；  
   3. 依次拆除射频线：用记号笔标注每个射频接口对应的小区 / 端口号（如 “小区 1-TX1/RX1”），再断开连接；  
   4. 佩戴防静电手环（确认接地良好），使用专用工具拆除光模块（禁止触碰光口），盘绕光纤并做好保护（避免弯折半径＜30mm）；  
   5. 拆除 RRU 固定螺丝前，用防失手绳将设备绑定在稳固构件上（如抱杆、机架），缓慢松开螺丝，取下旧 RRU。

5. 安装新 RRU  
   1. 按原安装方向固定新 RRU，使用扳手紧固螺丝，确保设备无晃动；  
   2. 佩戴防静电手环安装光模块（确认型号匹配，插入时听到 “咔” 声为到位），连接光纤并使用扎带固定（避免线缆受力）；  
   3. 连接射频线（核对标注，确保对应关系正确），室外场景需做防水处理：  
      1. 第一步：在接口与线缆根部缠绕防水胶泥（厚度≥5mm，覆盖接口及线缆 10cm 范围，压实无气泡）；  
      2. 第二步：用防水胶布从接口向线缆方向叠压缠绕（重叠率≥50%），缠绕 3 层以上，末端用扎带固定；  
      3. 第三步：确保接口朝下（与水平方向夹角≥45°），防止雨水渗入；  
   4. 最后连接电源接口（核对正负极标记），确保插头完全插入。

6. 与后台核对业务  
   1. 接通电源空开，后台确认 RRU 上电正常（指示灯为绿色常亮，无闪烁告警）；  
   2. 后台激活对应小区，核查关键指标：  
      1. 光模块接收功率在设备标称正常范围（通常为 -6~-12dBm，具体参照设备手册为准）；  
      2. 驻波比≤1.5（全频段无异常）；  
      3. 发射功率与原配置偏差≤2dB；  
      4. 无 “RRU 通信中断”“电源故障”“光模块异常” 等告警，原故障告警已清除；  
   3. 现场拨打测试电话（语音）、测速（数据），确认业务恢复正常。
## 闭环管理 

### 1、现场收尾
1. 告知接口人目标 RRU 故障已修复，设备运行正常，出示业务测试结果，感谢其配合；
2. 回收故障 RRU（粘贴故障标签，注明站点名称、型号、序列号、故障现象、更换日期、更换人），光模块单独放入防静电包装盒（标注对应信息）；
3. 整理工具（清理现场遗留杂物），关闭机房门并锁好（若为机房场景），签署《基站出入登记单》（注明离场时间）。

### 2、工单归档
登录掌上运维 APP，进入代维掌中宝 - 故障工单，工单回复内容：“已更换 XX 型号 RRU（新序列号：XXX），原故障告警消除，小区业务恢复正常，指标达标”。

### 3、回收故障件
- 对故障 RRU 标注关键信息（故障现象如 “无输出功率”“光口告警”、更换日期、所属小区、原光模块参数）；
- 提供新 RRU 序列号照片、安装后设备外观照片、故障工单截图；
- 按故障件管理流程移交仓管员，双方签署《故障设备交接单》（注明交接时间、状态），由仓管员登记送修。

### 4、信息记录与变更
- 记录新 RRU 的型号、序列号、安装位置、入网时间；
- 通知资管员更新综资系统对应数据（确保与网管、台账信息一致），同步更新站点设备分布图。
`;

/**
 * 解析告警级别
 * @param levelStr 告警级别字符串
 * @returns 级别数字 1-4
 */
function parseLevel(levelStr: string): 1 | 2 | 3 | 4 {
  if (levelStr.includes("一")) return 1;
  if (levelStr.includes("二")) return 2;
  if (levelStr.includes("三")) return 3;
  if (levelStr.includes("四")) return 4;
  return 4; // 默认
}

/**
 * 解析工单状态
 * @param statusStr 状态字符串
 * @returns Alert状态
 */
function parseStatus(statusStr: string): "active" | "resolved" | "pending" {
  if (statusStr === "已归档" || statusStr === "已解决") return "resolved";
  if (statusStr === "处理中") return "active";
  return "pending";
}

/**
 * 格式化描述信息，处理可能为对象的情况
 * @param raw 原始数据
 * @returns 格式化后的字符串
 */
function formatDescription(raw: any): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    // 尝试提取有用信息，如果结构匹配的话
    if (raw.alarmTitle) {
      return `${raw.alarmTitle} ${raw.addInfo ? `- ${raw.addInfo}` : ""}`;
    }
    return JSON.stringify(raw);
  }
  return String(raw);
}

/**
 * 将API返回的工单数据转换为Alert格式
 * @param item API工单项
 * @returns Alert对象
 */
function mapWorkOrderToAlert(item: WorkOrderItem): Alert {
  // console.log(item);
  const alert: Alert = {
    id: item.work_order_id,
    title: item.order_subject || item.GJ00008,
    type: item.GJ00008,
    level: parseLevel(item.warning_level),
    location: item.GJ00010 || item.city_name_1,
    time: item.created_time,
    description:
      formatDescription(item.details?.["告警原文"]) || item.order_subject,
    status: parseStatus(item.order_status),
    workOrderInfo: {
      id: item.work_order_id,
      createdAt: item.created_time,
      waitTime: "未知", // API未提供
      manager: item.current_owner_role || "未知",
      managerTime: item.GJ00021 || "未知",
      reason: item.details?.["告警名称"] || "",
      coverScene: item.details?.["覆盖场景"] || "",
    },
    alertContent: {
      type: item.details?.["告警网管"] || item.source_name,
      title: item.GJ00008 || "",
      productor: item.GJ00011 || "",
      source: item.source_name,
      location: item.details?.["告警地点"] || item.GJ00010,
      devices: item.details?.["告警网元"]
        ? [String(item.details["告警网元"])]
        : [],
      recoveryTime: "未知", // API未提供
      addinfo: item.details?.["告警原文"] || "",
      fault_impact_range: item.fault_impact_range || "",
    },
    faultDetail: {
      reason: item.details?.["告警名称"] || "",
      affectedDevices: item.details?.["告警网元"]
        ? [String(item.details["告警网元"])]
        : [],
      lossEstimate: "未知",
    },
    solutions: {
      emergency: ["请参考告警帮助资料"],
      conclusion: item.details?.["conclusion"] || "",
      prevention: [],
      maintenance: [],
      markdown: FA00001_SOLUTION,
    },
  };
  console.log('mapWorkOrderToAlert',alert);
  return alert;
}

/**
 * 获取工单数据
 * @returns Promise<Alert[]>
 */
export async function fetchWorkOrders(): Promise<Alert[]> {
  try {
    // 使用相对路径，触发vite代理转发到 http://36.138.75.78:7190/api/v1/work-orders
    const response = await fetch("/api/v1/work-orders");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: WorkOrderResponse = await response.json();
    return data.items.map(mapWorkOrderToAlert);
  } catch (error) {
    console.error("Failed to fetch work orders:", error);
    return [];
  }
}

/**
 * 获取工单诊断方案
 * @param workOrderId 工单ID
 * @returns Promise<DiagnosisItem[]>
 */
export async function fetchDiagnosis(
  workOrderId: string
): Promise<DiagnosisItem[]> {
  try {
    const response = await fetch(
      `/api/v1/diagnosis?work_order_id=${workOrderId}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: DiagnosisResponse = await response.json();
    if (data.success) {
      const diagnosisItems = data.data.filter(
        (item) => item.solution_content || item.solution_code || item.fault_impact_range || (item.processes && item.processes.length > 0)
      );
      // 返回所有有效诊断记录
      return diagnosisItems;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch diagnosis:", error);
    return [];
  }
}

export interface BasicInfoResponse {
  BBU_Room: {
    机房名称: string;
    地址信息: {
      地址: string;
      经度: number;
      纬度: number;
    };
    是否铁塔站点: string;
    产权相关信息: {
      产权单位: string;
      配套产权单位: string;
      外电产权单位: string;
      铁塔机房产品分类: string;
    };
  };
  RRU_Room: {
    机房名称: string;
    地址信息: {
      地址: string;
      经度: number;
      纬度: number;
    };
    是否铁塔站点: string;
    产权相关信息: {
      产权单位: string;
      配套产权单位: string;
      外电产权单位: string;
      铁塔机房产品分类: string;
    };
  };
  tower: {
    "铁塔塔身高度(米)": string;
    铁塔类型: string;
    产权单位: string;
    铁塔产品种类: string;
    产权性质: string;
  };
  serial: {
    设备类型: string;
    设备型号: string;
    串号: string;
  }[];
}

/**
 * 获取工单基本信息
 * @param workOrderId 工单ID
 * @returns Promise<BasicInfoResponse | null>
 */
export async function fetchBasicInfo(
  workOrderId: string
): Promise<BasicInfoResponse | null> {
  try {
    const response = await fetch(
      `/api/v1/information?work_order_id=${workOrderId}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: BasicInfoResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch basic info:", error);
    return null;
  }
}

/**
 * 接单
 * @param workOrderId 工单ID
 * @returns Promise<boolean> 是否成功
 */
export async function acceptWorkOrder(workOrderId: string): Promise<boolean> {
  try {
    const response = await fetch("/api/v1/work-orders/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ work_order_id: workOrderId }),
    });

    if (!response.ok) {
      // 如果接口不存在(404)或失败，我们在演示环境中模拟成功
      console.warn(
        `API call failed: ${response.status}, simulating success for demo`
      );
      return true;
    }

    const data = await response.json();
    return data.success || data.code === 200;
  } catch (error) {
    console.error("Failed to accept work order:", error);
    // 演示环境模拟成功
    return true;
  }
}

export interface QAResponse {
  success: boolean;
  error: string;
  answer: string;
}

/**
 * 获取深度探究问答结果
 * @param question 问题内容
 * @param workOrderId 工单ID
 * @returns Promise<QAResponse | null>
 */
export async function fetchQA(
  question: string,
  workOrderId: string
): Promise<QAResponse | null> {
  try {
    const response = await fetch(
      `/api/v1/qa?question=${encodeURIComponent(question)}&work_order_id=${workOrderId}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: QAResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch QA:", error);
    return null;
  }
}

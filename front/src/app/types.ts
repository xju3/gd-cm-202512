export interface Alert {
  id: string;
  title: string;
  type: string;
  level: 1 | 2 | 3 | 4; // 告警级别
  location: string;
  time: string;
  description: string;
  status: 'active' | 'resolved' | 'pending';
  workOrderInfo: {
    id: string;
    createdAt: string;
    waitTime: string;
    manager: string;
    managerTime: string;
    reason: string;
    coverScene: string;
  };
  alertContent: {
    type: string;
    title: string;
    productor: string;
    source: string;
    location: string;
    devices: string[];
    recoveryTime: string;
    addinfo?: unknown;
    fault_impact_range?: string;
  };
  faultDetail: {
    reason: string;
    affectedDevices: string[];
    lossEstimate: string;
  };
  solutions: {
    emergency: string[];
    prevention: string[];
    maintenance: string[];
    markdown?: string;
  };
}

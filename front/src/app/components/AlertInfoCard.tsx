import React, { useState } from 'react';
import { Alert } from '../types';

interface AlertInfoCardProps {
  selectedAlert: Alert;
}

export function AlertInfoCard({ selectedAlert }: AlertInfoCardProps) {
  const [isLocationExpanded, setIsLocationExpanded] = useState(false);

  /**
   * 将定位信息对象格式化为可读字符串
   */
  function formatLocationInfo(info: Record<string, any>): string {
    const parts: string[] = [];
    const keys = [
      'addInfo',
      'locationInfo',
      'specificProblem',
      'alarmTitle',
      'neName',
      'objectName',
      'alarmType',
      'origSeverity',
    ];
    keys.forEach(k => {
      const v = info?.[k];
      if (typeof v === 'string' && v.trim()) parts.push(v.trim());
    });
    if (parts.length > 0) {
      return parts.join('；');
    }
    try {
      return JSON.stringify(info);
    } catch {
      return '暂无';
    }
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <h3 className="font-semibold text-sm mb-3 text-gray-800 pb-2 border-b">当前告警信息</h3>
      <div className="space-y-2 text-xs">
        <div className="flex py-2 border-b border-gray-100">
          <span className="w-20 text-gray-500">工单号：</span>
          <span className="flex-1 text-gray-800">{selectedAlert.workOrderInfo.id}</span>
        </div>
        <div className="flex py-2 border-b border-gray-100">
          <span className="w-20 text-gray-500">工单标题：</span>
          <span className="flex-1 text-gray-800">{selectedAlert.title}</span>
        </div>
        <div className="flex py-2 border-b border-gray-100">
          <span className="w-20 text-gray-500">设备厂家：</span>
          <span className="flex-1 text-gray-800">{selectedAlert.alertContent.productor}</span>
        </div>
        <div className="flex py-2 border-b border-gray-100">
          <span className="w-20 text-gray-500">告警网管：</span>
          <span className="flex-1 text-gray-800">{selectedAlert.alertContent.type}</span>
        </div>
        <div className="flex py-2 border-b border-gray-100">
          <span className="w-20 text-gray-500">工单时间：</span>
          <span className="flex-1 text-gray-800">{selectedAlert.workOrderInfo.createdAt}</span>
        </div>
        <div className="flex py-2 border-b border-gray-100">
          <span className="w-20 text-gray-500">告警网元：</span>
          <span className="flex-1 text-gray-800">{selectedAlert.alertContent.devices.join(', ') || selectedAlert.alertContent.source}</span>
        </div>
        <div className="flex py-2 border-b border-gray-100">
          <span className="w-20 text-gray-500">告警名称：</span>
          <span className="flex-1 text-gray-800">{selectedAlert.alertContent.title}</span>
        </div>
        <div className="flex py-2 border-b border-gray-100">
          <span className="w-20 text-gray-500">告警时间：</span>
          <span className="flex-1 text-gray-800">{selectedAlert.time}</span>
        </div>
        <div className="flex py-2">
          <span className="shrink-0 w-20 text-gray-500">告警原文：</span>
          <div className="flex-1 min-w-0">
            <div
              className={
                isLocationExpanded
                  ? 'text-gray-800 whitespace-pre-wrap break-all overflow-auto max-h-40 pr-1'
                  : 'text-gray-800 break-all overflow-hidden max-h-10'
              }
              title={
                isLocationExpanded
                  ? undefined
                  : (
                      (() => {
                        const raw =
                          selectedAlert.details?.['告警名称'] ??
                          selectedAlert.alertContent?.addinfo;
                        if (typeof raw === 'string') return raw;
                        if (raw && typeof raw === 'object') return formatLocationInfo(raw as Record<string, any>);
                        return '暂无';
                      })()
                    )
              }
            >
              {(() => {
                const raw =
                  selectedAlert.details?.['告警名称'] ??
                  selectedAlert.alertContent?.addinfo;
                if (typeof raw === 'string') return raw;
                if (raw && typeof raw === 'object') return formatLocationInfo(raw as Record<string, any>);
                return '暂无';
              })()}
            </div>
            {(selectedAlert.details?.['告警名称'] ?? selectedAlert.alertContent?.addinfo) && (
              <button
                type="button"
                className="mt-1 text-xs text-green-600 hover:text-green-700"
                onClick={() => setIsLocationExpanded(prev => !prev)}
              >
                {isLocationExpanded ? '收起' : '展开'}
              </button>
            )}
          </div>
        </div>

        <div className="flex py-2">
          <span className="shrink-0 w-20 text-gray-500">覆盖场景：</span>
          <span className="flex-1 text-gray-800 truncate" title={selectedAlert.workOrderInfo.coverScene ?? '暂无'}>
            {selectedAlert.workOrderInfo.coverScene ?? '暂无'}
          </span>
        </div>
      </div>
    </div>
  );
}

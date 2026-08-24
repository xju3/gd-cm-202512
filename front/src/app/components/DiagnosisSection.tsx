import React from 'react';
import { Check, X, AlertTriangle, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { DiagnosisItem } from '../api/workOrderService';
import { Alert } from '../types';

interface DiagnosisSectionProps {
  diagnosis: DiagnosisItem[];
  selectedAlert: Alert;
}

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

export function DiagnosisSection({ diagnosis, selectedAlert }: DiagnosisSectionProps) {
  const getLatestProcess = (keyword: string) => {
    // 倒序查找最新的诊断记录
    const reversed = [...diagnosis].reverse();
    const item = reversed.find(d => d.processes?.some(p => p.includes(keyword)));
    return item?.processes?.find(p => p.includes(keyword));
  };

  const extractProcessContent = (process: string) => {
    if (!process) return '';
    // 尝试匹配中文冒号
    let index = process.indexOf('：');
    if (index !== -1) return process.substring(index + 1);
    // 尝试匹配英文冒号
    index = process.indexOf(':');
    if (index !== -1) return process.substring(index + 1);
    // 如果没有冒号，尝试去除前缀 (如 Y-标题)
    return process.replace(/^[YN]-[^\s:：]+[:：]?/, '');
  };

  return (
    <>
      {/* 故障诊断 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <h3 className="font-semibold text-sm mb-3 text-gray-800 pb-2 border-b">故障诊断</h3>
        
        {/* 如果有 AI 诊断的 processes 数据，使用新版展示逻辑 */}
        {diagnosis.some(d => d.processes && d.processes.length > 0) ? (
          <div className="space-y-3 text-xs">
             {/* 动力配套 */}
             <div>
               <div className="font-medium text-gray-700 mb-1 flex items-center gap-2">
                  {(() => {
                    const process = getLatestProcess('动力配套');
                    const isNormal = process?.startsWith('Y-');
                    return (
                      <>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isNormal ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                          {isNormal ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span>动力配套：</span>
                      </>
                    );
                  })()}
               </div>
               <div className="text-gray-600 leading-relaxed pl-7">
                 {(() => {
                   const process = getLatestProcess('动力配套');
                   return process ? extractProcessContent(process) : '暂无动力配套信息';
                 })()}
               </div>
             </div>

             {/* 传输链路 */}
             <div>
               <div className="font-medium text-gray-700 mb-1 flex items-center gap-2">
                  {(() => {
                    const process = getLatestProcess('传输链路');
                    const isNormal = process?.startsWith('Y-');
                    return (
                      <>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isNormal ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                          {isNormal ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span>传输链路：</span>
                      </>
                    );
                  })()}
               </div>
               <div className="text-gray-600 leading-relaxed pl-7">
                 {(() => {
                    const process = getLatestProcess('传输链路');
                    return process ? extractProcessContent(process) : '暂无传输链路信息';
                 })()}
               </div>
             </div>

             {/* 无线设备 */}
             <div>
               <div className="font-medium text-gray-700 mb-1 flex items-center gap-2">
                  {(() => {
                    // 查找包含设备型号信息的条目 (通常包含厂家名称或BBU型号)
                    const process = getLatestProcess('无线设备');
                    const isNormal = process?.startsWith('Y-');
                    return (
                      <>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${isNormal ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                          {isNormal ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span>无线设备：</span>
                      </>
                    );
                  })()}
               </div>
               <div className="text-gray-600 leading-relaxed pl-7">
                 {(() => {
                    const process = getLatestProcess('无线设备');
                    return process ? extractProcessContent(process) : '暂无无线设备信息';
                 })()}
               </div>
             </div>

             {/* 历史情况 (保留模板信息) */}
             <div>
               <div className="font-medium text-gray-700 mb-1 flex items-center gap-2">
                 <div className="w-5 h-5 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                   <AlertTriangle className="w-3.5 h-3.5 stroke-[3]" />
                 </div>
                 <span>历史情况：</span>
               </div>
               <div className="text-gray-600 leading-relaxed pl-7">
                 查询近6个月故障记录及设备维护台账，无该ENodeB设备及同型号板卡、电源模块的故障记录，排除历史遗留问题及批次性故障。
               </div>
             </div>
             
             {/* 诊断结果 (单独板块) */}
             {/* 此处原诊断结果已移除，移至下方独立区域 */}
          </div>
        ) : (
          /* 旧版展示逻辑 (无 AI process 数据时回退) */
          <div className="space-y-3 text-xs">
            <div>
              <div className="font-medium text-gray-700 mb-1">动力故障：</div>
              <div className="text-gray-600 leading-relaxed">{selectedAlert.faultDetail.reason}</div>
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">受影响设备：</div>
              <div className="text-gray-600 leading-relaxed">{selectedAlert.faultDetail.affectedDevices.join('、')}</div>
            </div>
            <div>
               <div className="font-medium text-gray-700 mb-1">详细描述：</div>
               <div className="text-gray-600 leading-relaxed">
                  {(() => {
                    const raw = selectedAlert.alertContent.addinfo;
                    const diagnosisDesc = Array.from(new Set(diagnosis.map(d => d.descriptions).filter(Boolean))).join('\n');
                    
                    let content = '';
                    if (typeof raw === 'string') content = raw;
                    else if (raw && typeof raw === 'object') content = formatLocationInfo(raw as Record<string, any>);
                    else content = '暂无';

                    return (
                      <div className="space-y-2">
                         <div>{content}</div>
                         {diagnosisDesc && (
                           <div className="bg-gray-50 p-2 rounded text-gray-500 border border-gray-100 mt-1">
                             <div className="text-xs font-medium mb-1">AI分析描述:</div>
                             <ReactMarkdown components={{
                                p: ({node, ...props}) => <p className="mb-1" {...props} />
                             }}>
                               {diagnosisDesc}
                             </ReactMarkdown>
                           </div>
                         )}
                      </div>
                    );
                  })()}
               </div>
            </div>
            <div>
              <div className="font-medium text-gray-700 mb-1">诊断结果：</div>
              <div className="text-gray-600 leading-relaxed">
                {(() => {
                  const originalConclusion = selectedAlert.solutions.conclusion;
                  const diagnosisConclusion = Array.from(new Set(diagnosis.map(d => d.conclusion).filter(Boolean))).join('\n');
                  
                  return (
                    <div className="space-y-2">
                       {originalConclusion && <div>{originalConclusion}</div>}
                       {diagnosisConclusion && (
                         <div className="bg-gray-50 p-2 rounded text-gray-500 border border-gray-100 mt-1">
                           <div className="text-xs font-medium mb-1">AI诊断结论:</div>
                           <ReactMarkdown components={{
                              p: ({node, ...props}) => <p className="mb-1" {...props} />
                           }}>
                             {diagnosisConclusion}
                           </ReactMarkdown>
                         </div>
                       )}
                       {!originalConclusion && !diagnosisConclusion && '暂无诊断结果'}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 诊断结果 (独立板块 - 仅在新版数据模式下显示) */}
      {diagnosis.some(d => d.processes && d.processes.length > 0) && (
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b">
            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="w-3 h-3 text-blue-600" />
            </div>
            <h3 className="font-semibold text-sm text-gray-800">诊断结果</h3>
          </div>
          
          <div className="space-y-3 text-xs">
            {/* 故障根因 */}
            <div>
              <div className="font-medium text-gray-700 mb-1">故障根因：</div>
              <div className="text-gray-600 leading-relaxed pl-2 border-l-2 border-blue-200">
                {(() => {
                   // 获取所有非空的结论
                   const validConclusions = diagnosis.map(d => d.conclusion).filter(Boolean);
                   // 优先取最后一个（通常是最终结论），如果没有则取第一个
                   const finalConclusion = validConclusions[validConclusions.length - 1] || validConclusions[0];
                   
                   return finalConclusion ? (
                      <ReactMarkdown components={{
                         p: ({node, ...props}) => <p className="mb-1" {...props} />
                      }}>
                        {finalConclusion}
                      </ReactMarkdown>
                   ) : (selectedAlert.solutions.conclusion || '暂无');
                })()}
             </div>
            </div>

            {/* 影响范围 */}
            <div>
              <div className="font-medium text-gray-700 mb-1">影响范围：</div>
              <div className="text-gray-600 leading-relaxed pl-2 border-l-2 border-orange-200">
                 {[...diagnosis].reverse().find(d => d.fault_impact_range)?.fault_impact_range || selectedAlert.alertContent.fault_impact_range || selectedAlert.alertContent.source}
              </div>
            </div>

            {/* 紧急程度 */}
            <div>
              <div className="font-medium text-gray-700 mb-1">紧急程度：</div>
              <div className="pl-2">
                 {(() => {
                   const level = selectedAlert.level;
                   const levelMap: Record<number, string> = {
                     1: '一级告警',
                     2: '二级告警',
                     3: '三级告警',
                     4: '四级告警'
                   };
                   const levelText = levelMap[level] || `${level}级告警`;
                   const levelColor = level === 1 ? 'text-red-600 bg-red-50' :
                                    level === 2 ? 'text-orange-600 bg-orange-50' :
                                    level === 3 ? 'text-yellow-600 bg-yellow-50' : 'text-blue-600 bg-blue-50';
                   
                   return (
                     <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${levelColor}`}>
                       {levelText}
                     </span>
                   );
                 })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

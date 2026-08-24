import { useState, useEffect, useRef } from 'react';
import { Search, Settings, User, Mail, Volume2, Send, Check, X, RefreshCw, RotateCw, ChevronLeft, Loader2, Sparkles, FileText, ArrowRight, Bell, Bot, Play, AlertTriangle } from 'lucide-react';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Alert } from './types';
import { fetchWorkOrders, fetchDiagnosis, DiagnosisItem, acceptWorkOrder, fetchQA } from './api/workOrderService';
import ReactMarkdown from 'react-markdown';
import { BasicInfoCard } from './components/BasicInfoCard';
import { DiagnosisSection } from './components/DiagnosisSection';
import { AlertInfoCard } from './components/AlertInfoCard';

/**
 * 移动端主应用组件
 * 负责展示工单列表、详情及智能诊断方案
 */
export default function MobileApp() {
  const [searchQuery, setSearchQuery] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'system', content: string}[]>([]);
  const [activeMode, setActiveMode] = useState<'smart' | 'deep'>('smart');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSmartDiagnosis = () => {
    if (!chatInput.trim()) {
      setChatMessages(prev => [...prev, {
        role: 'system',
        content: '请输入要咨询的内容'
      }]);
    } else {
      setChatMessages(prev => [...prev, 
        { role: 'user', content: chatInput },
        { role: 'system', content: '请稍等方案生成中...' }
      ]);
      setChatInput('');
    }
  };

  const handleDeepExplore = async () => {
    if (!chatInput.trim()) {
      setChatMessages(prev => [...prev, {
        role: 'system',
        content: '请输入要咨询的内容'
      }]);
      return;
    }

    const question = chatInput;
    setChatInput('');

    setChatMessages(prev => [...prev, 
      { role: 'user', content: question },
      { role: 'system', content: '正在深入分析问题，请稍候...' }
    ]);

    try {
      // Use selectedAlert.id if available, otherwise it might fail or need a default
      if (!selectedAlert) return;
      
      const result = await fetchQA(question, selectedAlert.id);
      
      setChatMessages(prev => {
         const newMsgs = [...prev];
         const lastMsg = newMsgs[newMsgs.length - 1];
         // Remove loading message
         if (lastMsg.role === 'system' && lastMsg.content === '正在深入分析问题，请稍候...') {
             newMsgs.pop();
         }
         
         if (result && result.success) {
             newMsgs.push({ role: 'system', content: result.answer });
         } else {
             newMsgs.push({ role: 'system', content: result?.error || '抱歉，无法获取回答。' });
         }
         return newMsgs;
      });
    } catch (e) {
      setChatMessages(prev => {
         const newMsgs = [...prev];
         const lastMsg = newMsgs[newMsgs.length - 1];
         if (lastMsg.role === 'system' && lastMsg.content === '正在深入分析问题，请稍候...') {
             newMsgs.pop();
         }
         newMsgs.push({ role: 'system', content: '网络异常，请检查连接。' });
         return newMsgs;
      });
    }
  };

  const handleSend = () => {
    if (activeMode === 'smart') {
      handleSmartDiagnosis();
    } else {
      handleDeepExplore();
    }
  };

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisItem[]>([]);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  /**
   * 初始化加载工单数据
   */
  useEffect(() => {
    /**
     * 异步获取工单列表并更新状态
     */
    const loadData = async () => {
      const data = await fetchWorkOrders();
      setAlerts(data);
      // 默认选中第一个工单
      if (data.length > 0 && !selectedAlert) {
        setSelectedAlert(data[0]);
      }
    };
    loadData();
  }, []);

  /**
   * 监听选中工单变化，加载诊断方案
   */
  useEffect(() => {
    /**
     * 根据工单ID获取诊断信息
     */
    const loadDiagnosis = async () => {
      if (!selectedAlert) {
        setDiagnosis([]);
        return;
      }
      setDiagnosisLoading(true);
      const data = await fetchDiagnosis(selectedAlert.id);
      // console.log('diagnosis', data);
      setDiagnosis(data);
      setDiagnosisLoading(false);
    };
    loadDiagnosis();
  }, [selectedAlert?.id]);

  /**
   * 处理点击外部事件，关闭搜索下拉框
   */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /**
   * 处理工单点击事件
   * 显示"智能诊断中..."提示，延时0.5秒后显示详情
   */
  const handleAlertClick = (alert: Alert) => {
    // 如果点击的是当前已选中的工单，不做任何操作
    if (selectedAlert?.id === alert.id) return;

    setIsDiagnosing(true);
    setSelectedAlert(null); // 先清空选中状态，隐藏旧详情
    setIsSearchFocused(false); // 关闭搜索框（如果有）
    setTimeout(() => {
      setSelectedAlert(alert);
      setIsDiagnosing(false);
    }, 500);
  };

  /**
   * 处理接单
   */
  const handleAcceptOrder = async () => {
    if (!selectedAlert) return;
    
    const success = await acceptWorkOrder(selectedAlert.id);
    
    if (success) {
      const now = new Date().toLocaleString();
      // @ts-ignore - status type compatibility
      const updatedAlert: Alert = {
        ...selectedAlert,
        status: 'active',
        workOrderInfo: {
          ...selectedAlert.workOrderInfo,
          manager: '当前用户',
          managerTime: now
        }
      };
      
      setAlerts(prev => prev.map(a => 
        a.id === selectedAlert.id ? updatedAlert : a
      ));
      setSelectedAlert(updatedAlert);
    }
  };

  // 根据搜索词过滤工单
  const filteredAlerts = alerts.filter(alert => 
    alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex justify-between items-start mb-4">
            {/* Left Side */}
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white shadow-md mt-0.5">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-bold text-base text-gray-800">智棋 AIOps-Agent</h1>
                <p className="text-[10px] text-gray-500 mt-1">全域态精准排障，为您智能决策</p>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex flex-col items-end gap-2">
              <div className="bg-green-50 border border-green-100 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <User className="w-3.5 h-3.5 text-green-700" />
                <span className="text-xs font-medium text-green-700">工程师李明</span>
              </div>
              <div className="flex items-center gap-3 pr-1">
                <Settings className="w-4 h-4 text-green-600/80 hover:text-green-700 cursor-pointer" />
                <Volume2 className="w-4 h-4 text-green-600/80 hover:text-green-700 cursor-pointer" />
                <Bell className="w-4 h-4 text-green-600/80 hover:text-green-700 cursor-pointer" />
              </div>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="relative" ref={searchContainerRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="搜索工单号/站址/类型..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className="pl-10 border-gray-300 focus:border-green-400 focus:ring-green-400 h-9 text-sm"
              />
            </div>
             {/* Search Dropdown */}
             {isSearchFocused && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 z-50 max-h-80 overflow-y-auto">
                   {(searchQuery ? filteredAlerts : alerts).length > 0 ? (
                     <div className="py-2">
                       <div className="px-4 py-2 text-xs text-gray-500 font-medium bg-gray-50 border-b border-gray-100 sticky top-0">
                         {searchQuery ? '搜索结果' : '最近工单'}
                       </div>
                       {(searchQuery ? filteredAlerts : alerts).slice(0, 10).map(alert => (
                         <div 
                           key={alert.id}
                           className="px-4 py-3 hover:bg-green-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
                          onClick={() => handleAlertClick(alert)}
                        >
                           <div className="flex justify-between items-start mb-1">
                             <span className="font-medium text-sm text-gray-900 line-clamp-1">{alert.title}</span>
                             <Badge variant="outline" className={`text-xs ml-2 shrink-0 ${
                                alert.level === 1 ? 'border-red-200 text-red-600 bg-red-50' :
                                alert.level === 2 ? 'border-orange-200 text-orange-600 bg-orange-50' :
                                alert.level === 3 ? 'border-yellow-200 text-yellow-600 bg-yellow-50' :
                                'border-blue-200 text-blue-600 bg-blue-50'
                             }`}>
                               {alert.level === 1 ? '一级' : alert.level === 2 ? '二级' : alert.level === 3 ? '三级' : '四级'}
                             </Badge>
                           </div>
                           <div className="flex items-center gap-3 text-xs text-gray-500">
                             <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{alert.id}</span>
                             <span>{alert.location}</span>
                             <span>{alert.type}</span>
                           </div>
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="p-4 text-center text-sm text-gray-500">
                       未找到相关工单
                     </div>
                   )}
                </div>
              )}
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        {/* Alert List - Horizontal Scroll */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">工单列表</span>
            <span className="text-xs text-gray-500">共 {filteredAlerts.length} 条</span>
          </div>
          <div className="flex gap-3 items-stretch">
            {filteredAlerts.length > 0 && (
              <div className="flex-none w-10 bg-gradient-to-b from-green-500 to-green-600 rounded-lg shadow-sm flex items-center justify-center py-4 mb-2">
                <span className="text-white text-xs font-bold tracking-widest" style={{ writingMode: 'vertical-rl' }}>
                  智能诊断
                </span>
              </div>
            )}
            <div className="flex-1 w-0 overflow-x-auto whitespace-nowrap pb-2 hide-scrollbar">
              <div className="flex gap-3">
                {filteredAlerts.map(alert => {
                const levelColors = {
                  1: 'border-red-500 bg-gradient-to-br from-red-50 to-white',
                  2: 'border-orange-500 bg-gradient-to-br from-orange-50 to-white',
                  3: 'border-yellow-500 bg-gradient-to-br from-yellow-50 to-white',
                  4: 'border-blue-500 bg-gradient-to-br from-blue-50 to-white'
                };
                const levelBadges = {
                  1: 'bg-red-500',
                  2: 'bg-orange-500',
                  3: 'bg-yellow-500',
                  4: 'bg-blue-500'
                };
                const isSelected = selectedAlert?.id === alert.id;
                return (
                  <div
                    key={alert.id}
                    onClick={() => handleAlertClick(alert)}
                    className={`inline-flex cursor-pointer hover:shadow-lg transition-all border-l-4 ${levelColors[alert.level]} rounded-lg overflow-hidden min-w-[280px] shadow-sm ${isSelected ? 'ring-2 ring-green-500' : ''}`}
                  >
                    {/* 卡片内容 */}
                    <div className="flex-1 p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-gray-800">{alert.workOrderInfo.id}</span>
                            <Badge className={`${levelBadges[alert.level]} text-white text-xs px-1.5 py-0`}>
                              {alert.level}级
                            </Badge>
                          </div>
                          <div className="text-xs text-green-600 mb-2">
                            {alert.description.substring(0, 15)}...
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 text-xs text-gray-600">
                        <div className="flex">
                          <span className="w-16 text-gray-500">站点名称</span>
                          <span className="flex-1 text-gray-800 truncate">{alert.title}</span>
                        </div>
                        <div className="flex">
                          <span className="w-16 text-gray-500">故障时间</span>
                          <span className="flex-1 text-gray-800">{alert.time}</span>
                        </div>
                        <div className="flex">
                          <span className="w-16 text-gray-500">基站分组</span>
                          <span className="flex-1 text-gray-800 truncate">{alert.location}</span>
                        </div>
                        <div className="flex">
                          <span className="w-16 text-gray-500">故障类型</span>
                          <span className="flex-1 text-gray-800 truncate">{alert.type}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

        {filteredAlerts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-sm">未找到相关告警信息</p>
          </div>
        )}

        {/* 详细内容区域 */}
        {isDiagnosing && (
          <div className="flex flex-col items-center justify-center py-24 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-green-50 to-green-100 rounded-full flex items-center justify-center mb-4 shadow-inner relative">
              <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-20"></div>
              <Bot className="w-8 h-8 text-green-600 relative z-10" />
            </div>
            <div className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 text-green-500 animate-spin" />
              <p className="text-gray-500 text-sm font-medium">智能诊断中...</p>
            </div>
          </div>
        )}

        {selectedAlert && !isDiagnosing && (
          <div className="space-y-4 pb-20">
            {/* AIOps提示信息 */}
            <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-700 leading-relaxed border border-gray-200 flex gap-2 items-start">
               <Bot className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
               <div>
                  <div>AIOps-Agent您好!</div>
                  <div className="mt-1">
                    检测到 <span className="font-semibold text-red-600">{selectedAlert.title}</span> 发生{selectedAlert.level}级告警，已自动为您启动智能诊断流程
                  </div>
               </div>
            </div>

            {/* 当前告警信息 */}
            <AlertInfoCard selectedAlert={selectedAlert} />

            {/* 基本信息 */}
            <BasicInfoCard workOrderId={selectedAlert.id} />

            <DiagnosisSection diagnosis={diagnosis} selectedAlert={selectedAlert} />


            {/** 基本信息 （information） */}
            
            {/* 解决方案 (Using Diagnosis) */}
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-green-600"></div>
                </div>
                <h3 className="font-semibold text-sm text-gray-800">解决方案</h3>
              </div>
              
              <div className="space-y-4">
                 {diagnosisLoading ? (
                   <div className="flex justify-center py-4">
                     <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                     <span className="ml-2 text-xs text-gray-500">正在生成诊断方案...</span>
                   </div>
                 ) : diagnosis.length > 0 ? (
                   (() => {
                     // 过滤掉没有内容的方案，并取最后一个有效方案（通常是最新的）
                     const validSolutions = diagnosis.filter(d => d.solution_content);
                     const finalSolution = validSolutions[validSolutions.length - 1];
                     
                     if (!finalSolution) return (
                        <div className="prose prose-sm max-w-none text-xs text-gray-700">暂无解决方案</div>
                     );

                     return (
                       <div className="prose prose-sm max-w-none text-xs text-gray-700">
                         <ReactMarkdown components={{
                            h1: ({node, ...props}) => <h1 className="text-sm font-bold mt-2 mb-1" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xs font-bold mt-2 mb-1" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-xs font-bold mt-1 mb-1" {...props} />,
                            p: ({node, ...props}) => <p className="mb-1 leading-relaxed" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-0.5" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-0.5" {...props} />,
                            li: ({node, ...props}) => <li className="text-xs" {...props} />,
                          }}>
                           {finalSolution.solution_content}
                         </ReactMarkdown>
                       </div>
                     );
                   })()
                 ) : (
                    <div className="prose prose-sm max-w-none text-xs text-gray-700">
                       <ReactMarkdown components={{
                          h1: ({node, ...props}) => <h1 className="text-sm font-bold mt-2 mb-1" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-xs font-bold mt-2 mb-1" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-xs font-bold mt-1 mb-1" {...props} />,
                          p: ({node, ...props}) => <p className="mb-1 leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-0.5" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-0.5" {...props} />,
                          li: ({node, ...props}) => <li className="text-xs" {...props} />,
                        }}>
                         {selectedAlert.solutions.markdown || '暂无解决方案'}
                       </ReactMarkdown>
                    </div>
                 )}
              </div>

               {/* 操作按钮 */}
               <div className="pt-3 border-t mt-4">
                  {selectedAlert.status === 'pending' ? (
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 rounded-xl shadow-md flex items-center justify-center gap-2"
                      onClick={handleAcceptOrder}
                    >
                      <Play className="w-5 h-5" />
                      <span className="text-base font-medium">立即接单</span>
                    </Button>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <Button className="bg-green-500 hover:bg-green-600 text-white h-11 rounded-xl shadow-md flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">问题解决</span>
                      </Button>
                      <Button className="bg-red-500 hover:bg-red-600 text-white h-11 rounded-xl shadow-md flex items-center justify-center gap-2">
                        <X className="w-4 h-4" />
                        <span className="text-sm font-medium">问题未解决</span>
                      </Button>
                      <Button className="bg-green-400 hover:bg-green-500 text-white h-11 rounded-xl shadow-md flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        <span className="text-sm font-medium">工单流转</span>
                      </Button>
                      <Button className="bg-green-600 hover:bg-green-700 text-white h-11 rounded-xl shadow-md flex items-center justify-center gap-2">
                        <RotateCw className="w-4 h-4" />
                        <span className="text-sm font-medium">自动回单</span>
                      </Button>
                    </div>
                  )}
               </div>

            {/* 智能问答记录 */}
            {chatMessages.length > 0 && (
              <section className="mt-6 border-t pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-purple-500 to-purple-600 rounded-full"></div>
                  智能问答
                </h3>
                <div className="space-y-4">
                  {chatMessages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                        msg.role === 'user' 
                          ? 'bg-blue-500 text-white rounded-tr-none' 
                          : 'bg-gray-100 text-gray-800 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              </section>
            )}

            </div>
          </div>
        )}
      </main>

      {/* 底部固定输入框 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg px-4 py-3 z-50">
        {/* 搜索模式按钮 */}
        <div className="flex gap-2 mb-3">
          <Button 
            onClick={() => setActiveMode('smart')}
            className={`h-8 px-4 rounded-full shadow-sm flex items-center gap-1.5 transition-colors ${
              activeMode === 'smart' 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${activeMode === 'smart' ? 'text-white' : 'text-green-600'}`} />
            <span className="text-xs font-medium">智能诊断</span>
          </Button>
          <Button 
            onClick={() => setActiveMode('deep')}
            className={`h-8 px-4 rounded-full shadow-sm flex items-center gap-1.5 transition-colors ${
              activeMode === 'deep'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
            }`}
          >
            <Search className={`w-3.5 h-3.5 ${activeMode === 'deep' ? 'text-white' : 'text-green-600'}`} />
            <span className="text-xs font-medium">深度探究</span>
          </Button>
        </div>
        
        {/* 输入框 */}
        <div className="relative">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={activeMode === 'smart' ? "请输入告警关键词查询解决方案" : "请输入问题进行深度探究"}
            className="pr-12 border-gray-300 text-sm h-10 rounded-lg"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSend();
              }
            }}
          />
          <Button 
            size="icon"
            onClick={handleSend}
            className="absolute right-1 top-1 bg-green-500 hover:bg-green-600 text-white rounded-full w-8 h-8"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

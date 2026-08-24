import { useState, useEffect, useRef } from 'react';
import { Search, Bell, User, ChevronLeft, Settings, Volume2, Bot, Loader2 } from 'lucide-react';
import { Input } from './components/ui/input';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';
import { AlertCard } from './components/alert-card';
import { AlertDetail } from './components/alert-detail';
import { Alert } from './types';
import { fetchWorkOrders } from './api/workOrderService';

export default function DesktopApp() {
  const [searchQuery, setSearchQuery] = useState('');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const loadAlerts = async () => {
      const data = await fetchWorkOrders();
      setAlerts(data);
      if (data.length > 0) {
        setSelectedAlert(data[0]);
      }
    };
    loadAlerts();
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

  const filteredAlerts = alerts.filter(alert => 
    alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    alert.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 移动端返回按钮 */}
              {selectedAlert && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="lg:hidden" 
                  onClick={() => setSelectedAlert(null)}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-bold shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <h1 className="font-bold text-lg md:text-xl">智研-AIOps Agent</h1>
            </div>
            <div className="flex items-center gap-2">
              {/* 用户信息 */}
              <div className="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center">
                  <User className="w-4 h-4 text-green-700" />
                </div>
                <span className="text-sm text-green-800">工程师李明</span>
              </div>
              {/* 移动端用户头像 */}
              <Button variant="ghost" size="icon" className="sm:hidden rounded-full bg-green-50 hover:bg-green-100">
                <User className="w-5 h-5 text-green-700" />
              </Button>
              {/* 设置按钮 */}
              <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                <Settings className="w-5 h-5" />
              </Button>
              {/* 音量按钮 */}
              <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 hover:bg-green-50 hidden sm:flex">
                <Volume2 className="w-5 h-5" />
              </Button>
              {/* 通知按钮 */}
              <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                <Bell className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className={`grid gap-6 ${(selectedAlert || isDiagnosing) ? 'lg:grid-cols-3' : 'lg:grid-cols-3'}`}>
          {/* Left Panel - Alert List */}
          <div className={`lg:col-span-1 ${(selectedAlert || isDiagnosing) ? 'hidden lg:block' : 'block'}`}>
            {/* Search Bar */}
            <div className="mb-4 relative" ref={searchContainerRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="搜索工单号/站址/类型..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  className="pl-10 border-green-200 focus:border-green-400 focus:ring-green-400"
                />
              </div>

              {/* Search Dropdown */}
              {isSearchFocused && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 z-50 max-h-80 overflow-y-auto">
                   {filteredAlerts.length > 0 ? (
                     <div className="py-2">
                       <div className="px-4 py-2 text-xs text-gray-500 font-medium bg-gray-50 border-b border-gray-100 sticky top-0">
                         {searchQuery ? '搜索结果' : '最近工单'}
                       </div>
                       {filteredAlerts.slice(0, 10).map(alert => (
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

            {/* Stats */}
            <div className="flex overflow-x-auto pb-4 gap-3 mb-4 -mx-4 px-4 snap-x hide-scrollbar lg:grid lg:grid-cols-2 lg:gap-4 lg:pb-0 lg:mx-0 lg:px-0 lg:mb-6">
              <div className="min-w-[140px] snap-center bg-gradient-to-br from-red-50 to-rose-100 p-3 lg:p-4 rounded-lg border border-red-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xl lg:text-2xl font-semibold text-red-600">{alerts.filter(a => a.level === 1).length}</div>
                <div className="text-xs lg:text-sm text-red-700 font-medium">一级告警</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-red-200 rounded-full h-1 lg:h-1.5">
                    <div className="bg-red-500 h-1 lg:h-1.5 rounded-full" style={{width: `${(alerts.filter(a => a.level === 1).length / alerts.length) * 100}%`}}></div>
                  </div>
                  <span className="text-[10px] lg:text-xs text-red-600 font-medium">{Math.round((alerts.filter(a => a.level === 1).length / alerts.length) * 100)}%</span>
                </div>
              </div>
              <div className="min-w-[140px] snap-center bg-gradient-to-br from-orange-50 to-orange-100 p-3 lg:p-4 rounded-lg border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xl lg:text-2xl font-semibold text-orange-600">{alerts.filter(a => a.level === 2).length}</div>
                <div className="text-xs lg:text-sm text-orange-700 font-medium">二级告警</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-orange-200 rounded-full h-1 lg:h-1.5">
                    <div className="bg-orange-500 h-1 lg:h-1.5 rounded-full" style={{width: `${(alerts.filter(a => a.level === 2).length / alerts.length) * 100}%`}}></div>
                  </div>
                  <span className="text-[10px] lg:text-xs text-orange-600 font-medium">{Math.round((alerts.filter(a => a.level === 2).length / alerts.length) * 100)}%</span>
                </div>
              </div>
              <div className="min-w-[140px] snap-center bg-gradient-to-br from-yellow-50 to-amber-100 p-3 lg:p-4 rounded-lg border border-yellow-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xl lg:text-2xl font-semibold text-yellow-600">{alerts.filter(a => a.level === 3).length}</div>
                <div className="text-xs lg:text-sm text-yellow-700 font-medium">三级告警</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-yellow-200 rounded-full h-1 lg:h-1.5">
                    <div className="bg-yellow-500 h-1 lg:h-1.5 rounded-full" style={{width: `${(alerts.filter(a => a.level === 3).length / alerts.length) * 100}%`}}></div>
                  </div>
                  <span className="text-[10px] lg:text-xs text-yellow-600 font-medium">{Math.round((alerts.filter(a => a.level === 3).length / alerts.length) * 100)}%</span>
                </div>
              </div>
              <div className="min-w-[140px] snap-center bg-gradient-to-br from-blue-50 to-indigo-100 p-3 lg:p-4 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="text-xl lg:text-2xl font-semibold text-blue-600">{alerts.filter(a => a.level === 4).length}</div>
                <div className="text-xs lg:text-sm text-blue-700 font-medium">四级告警</div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-blue-200 rounded-full h-1 lg:h-1.5">
                    <div className="bg-blue-500 h-1 lg:h-1.5 rounded-full" style={{width: `${(alerts.filter(a => a.level === 4).length / alerts.length) * 100}%`}}></div>
                  </div>
                  <span className="text-[10px] lg:text-xs text-blue-600 font-medium">{Math.round((alerts.filter(a => a.level === 4).length / alerts.length) * 100)}%</span>
                </div>
              </div>
            </div>

            {/* Alert Cards */}
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-4 pr-4">
                {filteredAlerts.map(alert => (
                  <AlertCard
                    key={alert.id}
                    title={alert.title}
                    type={alert.type}
                    level={alert.level}
                    location={alert.location}
                    time={alert.time}
                    description={alert.description}
                    status={alert.status}
                    onClick={() => handleAlertClick(alert)}
                    isSelected={selectedAlert?.id === alert.id}
                  />
                ))}
              </div>

              {filteredAlerts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">未找到相关告警信息</p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Panel - Alert Detail */}
          {isDiagnosing && (
            <div className="lg:col-span-2">
              <div className="h-full flex flex-col items-center justify-center bg-white rounded-lg border shadow-sm min-h-[600px] animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-gradient-to-br from-green-50 to-green-100 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
                  <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-20"></div>
                  <Bot className="w-10 h-10 text-green-600 relative z-10" />
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                  <p className="text-gray-500 text-lg font-medium">智能诊断中...</p>
                </div>
              </div>
            </div>
          )}
          {selectedAlert && !isDiagnosing && (
            <div className="lg:col-span-2">
              <AlertDetail alert={selectedAlert} onClose={() => setSelectedAlert(null)} />
            </div>
          )}
        </div>
      </main>
      
    </div>
  );
}
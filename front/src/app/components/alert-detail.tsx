import { CheckCircle2, AlertCircle, Send, Archive, Sparkles, FileText, Clock, ArrowRight, X, ChevronLeft, Loader2, Bot } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { useState, useEffect, useRef } from 'react';
import { Alert } from '../types';
import { fetchDiagnosis, DiagnosisItem, fetchQA } from '../api/workOrderService';
import ReactMarkdown from 'react-markdown';

import { DiagnosisSection } from './DiagnosisSection';
import { BasicInfoCard } from './BasicInfoCard';
import { AlertInfoCard } from './AlertInfoCard';

interface AlertDetailProps {
  alert: Alert;
  onClose: () => void;
}

export function AlertDetail({ alert, onClose }: AlertDetailProps) {
  const [notes, setNotes] = useState('');
  const [diagnosis, setDiagnosis] = useState<DiagnosisItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'system', content: string}[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSmartDiagnosis = () => {
    if (!notes.trim()) {
      setChatMessages(prev => [...prev, {
        role: 'system',
        content: '请输入要咨询的内容'
      }]);
    } else {
      setChatMessages(prev => [...prev, 
        { role: 'user', content: notes },
        { role: 'system', content: '请稍等方案生成中...' }
      ]);
      setNotes('');
    }
  };

  const handleDeepExplore = async () => {
    if (!notes.trim()) {
      setChatMessages(prev => [...prev, {
        role: 'system',
        content: '请输入要咨询的内容'
      }]);
      return;
    }

    const question = notes;
    setNotes('');

    setChatMessages(prev => [...prev, 
      { role: 'user', content: question },
      { role: 'system', content: '正在深入分析问题，请稍候...' }
    ]);

    try {
      const result = await fetchQA(question, alert.id);
      
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

  useEffect(() => {
    const loadDiagnosis = async () => {
      setLoading(true);
      const data = await fetchDiagnosis(alert.id);
      setDiagnosis(data);
      setLoading(false);
    };
    if (alert.id) {
      loadDiagnosis();
    }
  }, [alert.id]);

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
            <Bot className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base md:text-lg">智研-AIOps Agent</CardTitle>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 flex items-center gap-1 shadow-sm">
                <Sparkles className="w-3 h-3" />
                智能诊断
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              AIOps Agent的诊断报告 "{alert.title}" 发生了一级告警，已自动分配给您现场故障。
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 md:p-6">
        <ScrollArea className="h-[calc(100vh-280px)] pr-4">
          <div className="space-y-6">
            {/* 当前管理单 */}
            <AlertInfoCard selectedAlert={alert} />

            <BasicInfoCard workOrderId={alert.id} />

            <DiagnosisSection diagnosis={diagnosis} selectedAlert={alert} />

            {/* 解决方案 */}
            <section>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <div className="w-1 h-5 bg-gradient-to-b from-green-500 to-emerald-500 rounded-full"></div>
                解决方案
              </h3>
              
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                  <span className="ml-2 text-green-500 text-sm flex items-center">正在生成解决方案...</span>
                </div>
              ) : (
                (() => {
                   // 优先使用 API 返回的诊断方案
                   const validSolutions = diagnosis.filter(d => d.solution_content);
                   const finalSolution = validSolutions[validSolutions.length - 1];

                   if (finalSolution) {
                     return (
                       <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
                         {finalSolution.name && (
                            <h4 className="font-semibold text-sm mb-2 text-green-700 flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              {finalSolution.name}
                            </h4>
                         )}
                         <div className="text-sm text-gray-700 markdown-content">
                           <ReactMarkdown components={{
                              h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-3 text-green-800" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-lg font-semibold mt-4 mb-2 text-green-700 border-b border-green-200 pb-1" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-base font-semibold mt-3 mb-1 text-green-600" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 mb-2 pl-2" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 mb-2 pl-2" {...props} />,
                              li: ({node, ...props}) => <li className="ml-1" {...props} />,
                              p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                           }}>
                             {finalSolution.solution_content}
                           </ReactMarkdown>
                         </div>
                         {finalSolution.solution_code && (
                           <div className="mt-3">
                             <div className="text-xs text-gray-500 mb-1 font-medium">参考代码/命令:</div>
                             <pre className="p-3 bg-slate-900 text-slate-50 rounded-md overflow-x-auto text-xs font-mono border border-slate-700 shadow-sm">
                               <code>{finalSolution.solution_code}</code>
                             </pre>
                           </div>
                         )}
                       </div>
                     );
                   }

                   // 回退到静态数据
                   if (alert.solutions.markdown) {
                     return (
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
                           <div className="text-sm text-gray-700">
                             <ReactMarkdown
                                components={{
                                    h1: ({node, ...props}) => <h1 className="text-xl font-bold mb-3 text-green-800" {...props} />,
                                    h2: ({node, ...props}) => <h2 className="text-lg font-semibold mt-4 mb-2 text-green-700 border-b border-green-200 pb-1" {...props} />,
                                    h3: ({node, ...props}) => <h3 className="text-base font-semibold mt-3 mb-1 text-green-600" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-1 mb-2 pl-2" {...props} />,
                                    ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-1 mb-2 pl-2" {...props} />,
                                    li: ({node, ...props}) => <li className="ml-1" {...props} />,
                                    p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                                    strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                                }}
                             >
                                {alert.solutions.markdown}
                             </ReactMarkdown>
                           </div>
                        </div>
                     );
                   }

                   // 回退到结构化字段
                   return (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-100">
                          <h4 className="font-semibold text-sm mb-2 text-green-700 flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            应急措施
                          </h4>
                          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                            {alert.solutions.emergency.map((item, index) => (
                              <li key={index} className="break-words pl-2">{item}</li>
                            ))}
                          </ol>
                        </div>

                        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-4 rounded-lg border border-yellow-100">
                          <h4 className="font-semibold text-sm mb-2 text-yellow-700 flex items-center gap-2">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                            预防措施建议
                          </h4>
                          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                            {alert.solutions.prevention.map((item, index) => (
                              <li key={index} className="break-words pl-2">{item}</li>
                            ))}
                          </ol>
                        </div>

                        <div className="bg-gradient-to-br from-cyan-50 to-sky-50 p-4 rounded-lg border border-cyan-100">
                          <h4 className="font-semibold text-sm mb-2 text-cyan-700 flex items-center gap-2">
                            <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                            后续设备排查计划
                          </h4>
                          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                            {alert.solutions.maintenance.map((item, index) => (
                              <li key={index} className="break-words pl-2">{item}</li>
                            ))}
                          </ol>
                        </div>
                      </div>
                   );
                })()
              )}
            </section>

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
                      <div className={`max-w-[80%] p-3 rounded-lg text-sm ${
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
        </ScrollArea>

        {/* 操作按钮 */}
        <div className="flex flex-wrap gap-2 md:gap-3 mt-6 pt-6 border-t">
          <Button className="bg-green-500 hover:bg-green-600 text-white flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span className="hidden sm:inline">已完成诊断</span>
            <span className="sm:hidden">完成</span>
          </Button>
          <Button variant="destructive" className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">正在处理中</span>
            <span className="sm:hidden">处理中</span>
          </Button>
          <Button variant="outline" className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50 text-sm">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">工单结转</span>
            <span className="sm:hidden">结转</span>
          </Button>
          <Button variant="outline" className="flex items-center gap-2 border-green-300 text-green-700 hover:bg-green-50 text-sm">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">自动延迟</span>
            <span className="sm:hidden">延迟</span>
          </Button>
        </div>

        {/* AI问答框 */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="请输入与告警相关的问题和方案"
                className="w-full border-gray-300"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSmartDiagnosis} className="flex-1 sm:flex-none bg-green-500 hover:bg-green-600 text-white flex items-center gap-2 flex-shrink-0">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">智能诊断</span>
                <span className="sm:hidden">诊断</span>
              </Button>
              <Button variant="outline" onClick={handleDeepExplore} className="flex-1 sm:flex-none flex items-center gap-2 border-gray-300 flex-shrink-0">
                <ArrowRight className="w-4 h-4" />
                <span className="hidden sm:inline">深度探究</span>
                <span className="sm:hidden">探究</span>
              </Button>
              <Button size="icon" className="bg-green-500 hover:bg-green-600 text-white rounded-full flex-shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

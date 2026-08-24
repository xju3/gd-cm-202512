import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Database,
  FileText,
  LogOut,
  Plus,
  Save,
  Search,
  Shield,
  Wrench,
} from 'lucide-react';

import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import {
  adminLogin,
  clearAdminToken,
  createKnowledgeBaseRecord,
  fetchKnowledgeBaseOverview,
  fetchKnowledgeBaseRecords,
  getAdminToken,
  KnowledgeBaseOverviewItem,
  KnowledgeBasePayload,
  KnowledgeBaseRecord,
  KnowledgeBaseType,
  setAdminToken,
  updateKnowledgeBaseRecord,
} from './api/adminService';

const KNOWLEDGE_BASE_CONFIG: Array<{
  type: KnowledgeBaseType;
  label: string;
  description: string;
  icon: typeof AlertTriangle;
  contentLabel: string;
}> = [
  {
    type: 'alert',
    label: '告警知识库',
    description: '基于规则和告警类型维护诊断入口知识。',
    icon: AlertTriangle,
    contentLabel: '规则内容',
  },
  {
    type: 'experience',
    label: '经验知识库',
    description: '沉淀工单排障经验、过程记录和影响范围。',
    icon: BookOpen,
    contentLabel: '经验过程',
  },
  {
    type: 'solution',
    label: '解决方案知识库',
    description: '维护标准方案、操作步骤和方案正文。',
    icon: Wrench,
    contentLabel: '方案正文',
  },
];

interface FormState {
  title: string;
  category: string;
  summary: string;
  content: string;
  tags: string;
  source: string;
  references: string;
  metadata: string;
}

const DEFAULT_LOGIN = {
  username: 'admin',
  password: '123456',
};

/**
 * 根据知识库类型生成默认表单数据。
 * @param type 当前知识库类型
 * @returns 默认表单对象
 */
function createEmptyForm(type: KnowledgeBaseType): FormState {
  const categoryMap: Record<KnowledgeBaseType, string> = {
    alert: '规则诊断',
    experience: '案例经验',
    solution: '标准方案',
  };

  const metadataMap: Record<KnowledgeBaseType, Record<string, unknown>> = {
    alert: {
      rule_type_id: '',
      mock_name: '',
      match_examples: [],
    },
    experience: {
      work_order_id: '',
      solution_code: '',
      fault_impact_range: '',
    },
    solution: {
      solution_code: '',
      related_conclusions: [],
      related_work_orders: [],
    },
  };

  return {
    title: '',
    category: categoryMap[type],
    summary: '',
    content: '',
    tags: '',
    source: '后台手工录入',
    references: '',
    metadata: JSON.stringify(metadataMap[type], null, 2),
  };
}

/**
 * 将记录对象转换为表单可编辑结构。
 * @param record 当前选中的知识记录
 * @returns 表单状态
 */
function mapRecordToForm(record: KnowledgeBaseRecord): FormState {
  return {
    title: record.title,
    category: record.category,
    summary: record.summary,
    content: record.content,
    tags: record.tags.join(', '),
    source: record.source,
    references: record.references.join(', '),
    metadata: JSON.stringify(record.metadata || {}, null, 2),
  };
}

/**
 * 将表单内容转换为接口请求体。
 * @param form 当前表单状态
 * @returns 知识库保存数据
 */
function buildPayload(form: FormState): KnowledgeBasePayload {
  const metadata = form.metadata.trim() ? JSON.parse(form.metadata) : {};

  return {
    title: form.title.trim(),
    category: form.category.trim(),
    summary: form.summary.trim(),
    content: form.content.trim(),
    tags: form.tags
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    source: form.source.trim(),
    references: form.references
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    metadata,
  };
}

/**
 * 根据知识库类型获取展示配置。
 * @param type 知识库类型
 * @returns 配置对象
 */
function getKnowledgeBaseConfig(type: KnowledgeBaseType) {
  return KNOWLEDGE_BASE_CONFIG.find((item) => item.type === type) || KNOWLEDGE_BASE_CONFIG[0];
}

/**
 * 后台管理主页面。
 * 负责管理员登录、知识库查看与录入维护。
 */
export default function AdminApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState(DEFAULT_LOGIN);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<KnowledgeBaseType>('alert');
  const [overview, setOverview] = useState<KnowledgeBaseOverviewItem[]>([]);
  const [sourceSummary, setSourceSummary] = useState('');
  const [records, setRecords] = useState<KnowledgeBaseRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [formState, setFormState] = useState<FormState>(() => createEmptyForm('alert'));

  const currentConfig = getKnowledgeBaseConfig(activeTab);

  /**
   * 统一加载知识库总览统计。
   */
  const loadOverview = async () => {
    const response = await fetchKnowledgeBaseOverview();
    setOverview(response.items);
    setSourceSummary(response.source_summary);
  };

  /**
   * 加载当前标签页的知识库列表。
   * @param type 当前知识库类型
   */
  const loadRecords = async (type: KnowledgeBaseType) => {
    setLoadingRecords(true);
    setFormError('');
    try {
      const response = await fetchKnowledgeBaseRecords(type);
      setRecords(response.items);
      setSourceSummary(response.source_summary);

      if (response.items.length > 0) {
        setSelectedRecordId(response.items[0].id);
        setFormState(mapRecordToForm(response.items[0]));
      } else {
        setSelectedRecordId('');
        setFormState(createEmptyForm(type));
      }
    } finally {
      setLoadingRecords(false);
    }
  };

  /**
   * 初始化后台登录态。
   */
  useEffect(() => {
    const bootstrap = async () => {
      if (!getAdminToken()) {
        return;
      }
      try {
        await loadOverview();
        await loadRecords(activeTab);
        setIsAuthenticated(true);
      } catch (error) {
        clearAdminToken();
        setIsAuthenticated(false);
      }
    };

    bootstrap();
  }, []);

  /**
   * 在切换知识库类型后刷新对应数据。
   */
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    loadRecords(activeTab);
  }, [activeTab, isAuthenticated]);

  /**
   * 执行管理员登录。
   * @param event 表单提交事件
   */
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await adminLogin(loginForm.username, loginForm.password);
      setAdminToken(response.token);
      setIsAuthenticated(true);
      await loadOverview();
      await loadRecords(activeTab);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : '登录失败，请重试');
    } finally {
      setLoginLoading(false);
    }
  };

  /**
   * 退出管理员登录并清理本地状态。
   */
  const handleLogout = () => {
    clearAdminToken();
    setIsAuthenticated(false);
    setOverview([]);
    setRecords([]);
    setSelectedRecordId('');
    setFormState(createEmptyForm(activeTab));
  };

  /**
   * 选中现有记录并同步到右侧表单。
   * @param record 被选中的记录
   */
  const handleSelectRecord = (record: KnowledgeBaseRecord) => {
    setSelectedRecordId(record.id);
    setSaveSuccess('');
    setFormError('');
    setFormState(mapRecordToForm(record));
  };

  /**
   * 切换到新增模式，并准备空白表单。
   */
  const handleCreateNew = () => {
    setSelectedRecordId('');
    setSaveSuccess('');
    setFormError('');
    setFormState(createEmptyForm(activeTab));
  };

  /**
   * 保存当前表单，自动区分新增与更新。
   * @param event 表单提交事件
   */
  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setSaveSuccess('');

    if (!formState.title.trim() || !formState.content.trim()) {
      setFormError('请至少填写知识标题和主要内容。');
      return;
    }

    setSaveLoading(true);
    try {
      const payload = buildPayload(formState);
      if (selectedRecordId) {
        const updatedRecord = await updateKnowledgeBaseRecord(activeTab, selectedRecordId, payload);
        setRecords((prev) =>
          prev.map((item) => (item.id === updatedRecord.id ? updatedRecord : item))
        );
        setFormState(mapRecordToForm(updatedRecord));
        setSaveSuccess('知识库记录已更新。');
      } else {
        const createdRecord = await createKnowledgeBaseRecord(activeTab, payload);
        setRecords((prev) => [createdRecord, ...prev]);
        setSelectedRecordId(createdRecord.id);
        setFormState(mapRecordToForm(createdRecord));
        setSaveSuccess('知识库记录已新增。');
        await loadOverview();
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '保存失败，请稍后重试');
    } finally {
      setSaveLoading(false);
    }
  };

  /**
   * 过滤左侧知识列表，支持标题、摘要和标签搜索。
   */
  const filteredRecords = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) {
      return records;
    }
    return records.filter((record) => {
      const text = [
        record.title,
        record.category,
        record.summary,
        record.tags.join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(keyword);
    });
  }, [records, searchKeyword]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-300">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">项目管理后台</h1>
              <p className="text-sm text-slate-400">管理员登录后可维护三类知识库。</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">管理员账号</label>
              <Input
                value={loginForm.username}
                onChange={(event) =>
                  setLoginForm((prev) => ({ ...prev, username: event.target.value }))
                }
                className="border-slate-700 bg-slate-950 text-white"
                placeholder="请输入管理员账号"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">管理员密码</label>
              <Input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                }
                className="border-slate-700 bg-slate-950 text-white"
                placeholder="请输入管理员密码"
              />
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              演示账号：`admin`，密码：`123456`
            </div>

            {loginError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {loginError}
              </div>
            )}

            <Button
              type="submit"
              className="h-11 w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              disabled={loginLoading}
            >
              {loginLoading ? '登录中...' : '登录后台'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">项目管理后台</h1>
              <p className="text-sm text-slate-500">
                基于现有规则、工单诊断和方案文档生成初始知识库。
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="border-slate-300"
              onClick={() => {
                window.location.hash = '';
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回工单页
            </Button>
            <Button variant="outline" className="border-slate-300" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              退出登录
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {sourceSummary}
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {KNOWLEDGE_BASE_CONFIG.map((item) => {
            const overviewItem = overview.find((overviewRow) => overviewRow.type === item.type);
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                type="button"
                onClick={() => setActiveTab(item.type)}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  activeTab === item.type
                    ? 'border-emerald-500 bg-white shadow-md'
                    : 'border-slate-200 bg-white hover:border-emerald-300'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    {overviewItem?.count || 0} 条
                  </Badge>
                </div>
                <div className="text-base font-semibold text-slate-900">{item.label}</div>
                <div className="mt-1 text-sm text-slate-500">{item.description}</div>
              </button>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{currentConfig.label}</h2>
                <p className="text-sm text-slate-500">支持查看、搜索和选择已有知识条目。</p>
              </div>
              <Button onClick={handleCreateNew} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                <Plus className="mr-2 h-4 w-4" />
                新增
              </Button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                className="pl-9"
                placeholder="搜索标题、摘要或标签"
              />
            </div>

            <div className="space-y-3">
              {loadingRecords ? (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  正在加载知识库数据...
                </div>
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => handleSelectRecord(record)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      selectedRecordId === record.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="line-clamp-1 font-medium text-slate-900">{record.title}</div>
                      <Badge variant="outline">{record.category || '未分类'}</Badge>
                    </div>
                    <div className="line-clamp-2 text-sm text-slate-500">{record.summary || '暂无摘要'}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {record.tags.slice(0, 3).map((tag) => (
                        <span
                          key={`${record.id}-${tag}`}
                          className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-slate-400">更新于 {record.updated_at}</div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                  当前没有匹配的数据，点击“新增”可以直接录入。
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedRecordId ? '编辑知识条目' : `新增${currentConfig.label}`}
                </h2>
                <p className="text-sm text-slate-500">
                  当前录入类型：{currentConfig.label}，内容会持久化到服务端知识库文件。
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <FileText className="h-4 w-4" />
                {selectedRecordId || 'new-record'}
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSave}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">知识标题</label>
                  <Input
                    value={formState.title}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder={`请输入${currentConfig.label}标题`}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">知识分类</label>
                  <Input
                    value={formState.category}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, category: event.target.value }))
                    }
                    placeholder="请输入分类"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">知识摘要</label>
                <Textarea
                  value={formState.summary}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, summary: event.target.value }))
                  }
                  placeholder="请输入知识摘要或影响范围"
                  className="min-h-24"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">{currentConfig.contentLabel}</label>
                <Textarea
                  value={formState.content}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, content: event.target.value }))
                  }
                  placeholder={`请输入${currentConfig.contentLabel}`}
                  className="min-h-52"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">标签</label>
                  <Input
                    value={formState.tags}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, tags: event.target.value }))
                    }
                    placeholder="多个标签使用英文逗号分隔"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">来源说明</label>
                  <Input
                    value={formState.source}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, source: event.target.value }))
                    }
                    placeholder="例如：后台手工录入"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">关联引用</label>
                <Input
                  value={formState.references}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, references: event.target.value }))
                  }
                  placeholder="例如：FA00001, CMCC-GD-GZCL-20251211-002337"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">扩展信息（JSON）</label>
                <Textarea
                  value={formState.metadata}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, metadata: event.target.value }))
                  }
                  placeholder="请输入 JSON 格式扩展信息"
                  className="min-h-40 font-mono text-xs"
                />
              </div>

              {formError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {formError}
                </div>
              )}

              {saveSuccess && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {saveSuccess}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" className="bg-emerald-500 text-slate-950 hover:bg-emerald-400" disabled={saveLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {saveLoading ? '保存中...' : selectedRecordId ? '保存修改' : '新增记录'}
                </Button>
                <Button type="button" variant="outline" className="border-slate-300" onClick={handleCreateNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  清空重填
                </Button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

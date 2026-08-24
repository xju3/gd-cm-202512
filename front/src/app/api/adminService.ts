export type KnowledgeBaseType = 'alert' | 'experience' | 'solution';

export interface KnowledgeBaseRecord {
  id: string;
  title: string;
  category: string;
  summary: string;
  content: string;
  tags: string[];
  source: string;
  references: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseListResponse {
  type: KnowledgeBaseType;
  source_summary: string;
  items: KnowledgeBaseRecord[];
}

export interface KnowledgeBaseOverviewItem {
  type: KnowledgeBaseType;
  label: string;
  count: number;
}

export interface KnowledgeBaseOverviewResponse {
  source_summary: string;
  items: KnowledgeBaseOverviewItem[];
}

export interface AdminLoginResponse {
  success: boolean;
  token: string;
  username: string;
}

export interface KnowledgeBasePayload {
  title: string;
  category: string;
  summary: string;
  content: string;
  tags: string[];
  source: string;
  references: string[];
  metadata: Record<string, unknown>;
}

const ADMIN_TOKEN_KEY = 'admin-token';

/**
 * 获取当前已缓存的管理员令牌。
 * @returns 管理员令牌
 */
export function getAdminToken(): string {
  return window.localStorage.getItem(ADMIN_TOKEN_KEY) || '';
}

/**
 * 缓存管理员令牌，便于后续接口访问。
 * @param token 登录后返回的令牌
 */
export function setAdminToken(token: string): void {
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

/**
 * 清除本地缓存的管理员令牌。
 */
export function clearAdminToken(): void {
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

/**
 * 统一封装后台管理请求，并自动附带管理员令牌。
 * @param input 请求地址
 * @param init 请求参数
 * @returns 响应数据
 */
async function adminFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAdminToken()}`,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `请求失败: ${response.status}`);
  }

  return response.json();
}

/**
 * 管理员登录。
 * @param username 管理员账号
 * @param password 管理员密码
 * @returns 登录结果
 */
export async function adminLogin(
  username: string,
  password: string
): Promise<AdminLoginResponse> {
  const response = await fetch('/api/v1/admin/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || '登录失败');
  }

  return response.json();
}

/**
 * 获取知识库总览统计。
 * @returns 总览结果
 */
export async function fetchKnowledgeBaseOverview(): Promise<KnowledgeBaseOverviewResponse> {
  return adminFetch<KnowledgeBaseOverviewResponse>('/api/v1/admin/overview');
}

/**
 * 获取指定类型的知识库列表。
 * @param type 知识库类型
 * @param keyword 搜索关键字
 * @returns 知识库列表
 */
export async function fetchKnowledgeBaseRecords(
  type: KnowledgeBaseType,
  keyword = ''
): Promise<KnowledgeBaseListResponse> {
  const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
  return adminFetch<KnowledgeBaseListResponse>(`/api/v1/admin/knowledge-bases/${type}${query}`);
}

/**
 * 新增知识库记录。
 * @param type 知识库类型
 * @param payload 表单数据
 * @returns 新增后的记录
 */
export async function createKnowledgeBaseRecord(
  type: KnowledgeBaseType,
  payload: KnowledgeBasePayload
): Promise<KnowledgeBaseRecord> {
  return adminFetch<KnowledgeBaseRecord>(`/api/v1/admin/knowledge-bases/${type}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * 更新知识库记录。
 * @param type 知识库类型
 * @param recordId 记录ID
 * @param payload 表单数据
 * @returns 更新后的记录
 */
export async function updateKnowledgeBaseRecord(
  type: KnowledgeBaseType,
  recordId: string,
  payload: KnowledgeBasePayload
): Promise<KnowledgeBaseRecord> {
  return adminFetch<KnowledgeBaseRecord>(`/api/v1/admin/knowledge-bases/${type}/${recordId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

import React, { useEffect, useState } from 'react';
import { fetchBasicInfo, BasicInfoResponse } from '../api/workOrderService';
import { Loader2, Server, RadioTower, Database, Info } from 'lucide-react';

interface BasicInfoCardProps {
  workOrderId: string;
}

export function BasicInfoCard({ workOrderId }: BasicInfoCardProps) {
  const [data, setData] = useState<BasicInfoResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const info = await fetchBasicInfo(workOrderId);
      setData(info);
      setLoading(false);
    };
    if (workOrderId) {
      loadData();
    }
  }, [workOrderId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
          <Info className="w-3 h-3 text-blue-600" />
        </div>
        <h3 className="font-semibold text-sm md:text-base text-gray-800">基本信息</h3>
      </div>

      <div className="space-y-4 text-xs md:text-sm">
        {/* 所属BBU机房 */}
        <div>
          <div className="font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-500" />
            所属BBU机房
          </div>
          <div className="bg-gray-50 rounded p-2 border border-gray-100 space-y-1.5">
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16 md:w-20">机房名称:</span>
              <span className="text-gray-800 break-all">{data.BBU_Room?.机房名称 || '-'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16 md:w-20">地址:</span>
              <span className="text-gray-800 break-all">{data.BBU_Room?.地址信息?.地址 || '-'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16 md:w-20">经纬度:</span>
              <span className="text-gray-800 font-mono">
                {data.BBU_Room?.地址信息?.经度}, {data.BBU_Room?.地址信息?.纬度}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16 md:w-20">产权单位:</span>
              <span className="text-gray-800">{data.BBU_Room?.产权相关信息?.产权单位 || '-'}</span>
            </div>
          </div>
        </div>

        {/* RRU机房 */}
        <div>
          <div className="font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-500" />
            RRU机房
          </div>
          <div className="bg-gray-50 rounded p-2 border border-gray-100 space-y-1.5">
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16 md:w-20">机房名称:</span>
              <span className="text-gray-800 break-all">{data.RRU_Room?.机房名称 || '-'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16 md:w-20">地址:</span>
              <span className="text-gray-800 break-all">{data.RRU_Room?.地址信息?.地址 || '-'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16 md:w-20">经纬度:</span>
              <span className="text-gray-800 font-mono">
                {data.RRU_Room?.地址信息?.经度}, {data.RRU_Room?.地址信息?.纬度}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16 md:w-20">产权单位:</span>
              <span className="text-gray-800">{data.RRU_Room?.产权相关信息?.产权单位 || '-'}</span>
            </div>
          </div>
        </div>

        {/* 杆塔信息 */}
        <div>
          <div className="font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <RadioTower className="w-3.5 h-3.5 text-orange-500" />
            杆塔信息
          </div>
          <div className="bg-gray-50 rounded p-2 border border-gray-100 space-y-1.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex gap-2">
                <span className="text-gray-500 shrink-0">塔高:</span>
                <span className="text-gray-800">{data.tower?.["铁塔塔身高度(米)"] || '-'}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-gray-500 shrink-0">类型:</span>
                <span className="text-gray-800">{data.tower?.铁塔类型 || '-'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16">产权单位:</span>
              <span className="text-gray-800">{data.tower?.产权单位 || '-'}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-gray-500 shrink-0 w-16">产权性质:</span>
              <span className="text-gray-800">{data.tower?.产权性质 || '-'}</span>
            </div>
          </div>
        </div>

        {/* 查整站串号 */}
        <div>
          <div className="font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-teal-500" />
            整站串号
          </div>
          <div className="space-y-2">
            {data.serial?.map((item, idx) => (
              <div key={idx} className="bg-gray-50 rounded p-2 border border-gray-100 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="font-medium text-gray-700">{item.设备类型}</span>
                  <span className="text-gray-500">{item.设备型号}</span>
                </div>
                <div className="font-mono text-gray-600 break-all bg-white px-1.5 py-0.5 rounded border border-gray-100">
                  {item.串号}
                </div>
              </div>
            )) || <div className="text-gray-400 pl-2">暂无串号信息</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

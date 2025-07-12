'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { SectorAllocation } from '@/types/portfolio';

interface AssetAllocationChartProps {
  data: SectorAllocation[];
}

export default function AssetAllocationChart({ data }: AssetAllocationChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: SectorAllocation }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border">
          <p className="font-semibold text-gray-800">{data.sectorName}</p>
          <p className="text-blue-600">
            <span className="font-medium">금액:</span> {formatCurrency(data.value)}
          </p>
          <p className="text-green-600">
            <span className="font-medium">현재 비중:</span> {data.percentage.toFixed(1)}%
          </p>
          <p className="text-orange-600">
            <span className="font-medium">목표 비중:</span> {data.targetPercentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: { payload?: Array<{ value: string; color: string }> }) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload?.map((entry, index: number) => (
          <div key={index} className="flex items-center">
            <div 
              className="w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">섹터별 자산 배분</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 파이 차트 */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) => `${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 자산 배분 상세 목록 */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">자산별 상세 내역</h3>
          {data.map((asset, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded-full mr-3" 
                  style={{ backgroundColor: asset.color }}
                />
                <span className="font-medium text-gray-800">{asset.sectorName}</span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-800">
                  {formatCurrency(asset.value)}
                </p>
                <p className="text-sm text-gray-600">{asset.percentage.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 설명 텍스트 */}
      <div className="mt-6 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-700">
          💡 <strong>자산 배분 설명:</strong> 위 차트는 포트폴리오 내 각 자산 유형의 비중을 보여줍니다. 
          분산투자를 통해 리스크를 줄이고 안정적인 수익을 추구할 수 있습니다.
        </p>
      </div>
    </div>
  );
} 
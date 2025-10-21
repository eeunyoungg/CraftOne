import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { APP_COLORS } from '../../constants';

interface ChartDataItem {
    name: string;
    value: number;
}

interface ProjectBarChartProps {
    data: ChartDataItem[];
}

export const ProjectBarChart: React.FC<ProjectBarChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
    }

    const maxValue = Math.max(...data.map(d => d.value), 0);
    const colors = [APP_COLORS.primary, APP_COLORS.success, APP_COLORS.warning, APP_COLORS.danger, APP_COLORS.direct];

    return (
        <div className="space-y-4">
            {data.map((item, index) => (
                <div key={item.name} className="flex items-center">
                    <div className="w-1/3 text-sm text-gray-600 truncate">{item.name}</div>
                    <div className="w-2/3">
                        <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-4">
                                <div
                                    className="h-4 rounded-full"
                                    style={{
                                        width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                                        backgroundColor: colors[index % colors.length],
                                    }}
                                />
                            </div>
                            <span className="ml-3 text-sm font-semibold">{item.value.toFixed(2)}MM</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};


interface BurnupChartProps {
    data: { name: string; cumPlanMM: number; cumActualMM: number }[];
}

export const BurnupChart: React.FC<BurnupChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
    }
    
    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="MM" />
                <Tooltip formatter={(value: number) => `${value.toFixed(2)} MM`} />
                <Legend />
                <Line type="monotone" dataKey="cumPlanMM" name="Planned MM" stroke={APP_COLORS.secondary} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cumActualMM" name="Actual MM" stroke={APP_COLORS.primary} strokeWidth={2} dot={false} />
            </LineChart>
        </ResponsiveContainer>
    );
};
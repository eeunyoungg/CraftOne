import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, subMonths } from 'date-fns';

import Card from '../components/Card';
import SkeletonLoader from '../components/SkeletonLoader';
import { ProjectBarChart, BurnupChart } from '../components/charts/DashboardCharts';
import Tabs from '../components/Tabs';
import { api } from '../services/mockApi';
import { DashboardPageData, WeeklyOverload } from '../types';
import { CURRENT_USER } from '../constants';

const TABS = [
    { key: 'personal', label: '내 대시보드' },
    { key: 'team', label: '팀 대시보드' },
];

const WeeklyOverloadCard: React.FC<{ overloads?: WeeklyOverload[], scope: 'personal' | 'team' }> = ({ overloads, scope }) => {
    const title = "금주 과부하 상태";
    const relevantOverloads = scope === 'personal'
        ? overloads?.filter(o => o.userId === CURRENT_USER.id)
        : overloads;

    if (!relevantOverloads || relevantOverloads.length === 0) {
        return (
            <Card title={title}>
                <p className="text-sm text-gray-500">
                    {scope === 'personal' ? "금주에 과부하 상태인 날이 없습니다. 좋은 워라밸입니다! 👍" : "금주에 과부하 상태인 팀원이 없습니다."}
                </p>
            </Card>
        );
    }

    return (
        <Card title={title}>
            <ul className="space-y-2">
                {relevantOverloads.map((o, index) => (
                    <li key={index} className="text-sm flex justify-between items-center p-1 rounded-md bg-red-50">
                        <div>
                            <span className="font-semibold">{o.userName}</span>
                            <span className="text-gray-600"> - {o.dayOfWeek} ({o.date})</span>
                        </div>
                        <span className="font-bold text-danger">{o.actualH.toFixed(1)}h ({o.overloadPct.toFixed(0)}%)</span>
                    </li>
                ))}
            </ul>
        </Card>
    );
};

const MyDashboard: React.FC<{ data: DashboardPageData & { scope: 'personal' } }> = ({ data }) => {
    const { monthlyPlanMM, monthlyActualMM, monthlyPA, projectBreakdown, burnupData, upcomingDeadlines, weeklyOverload } = data;
    
    return (
        <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card><p className="text-sm text-gray-500">계획 (월)</p><p className="text-2xl font-bold">{monthlyPlanMM.toFixed(2)}MM</p></Card>
                <Card><p className="text-sm text-gray-500">실투입 (월)</p><p className="text-2xl font-bold">{monthlyActualMM.toFixed(2)}MM</p></Card>
                <Card><p className="text-sm text-gray-500">차이</p><p className={`text-2xl font-bold ${monthlyActualMM > monthlyPlanMM ? 'text-danger' : 'text-success'}`}>{(monthlyActualMM - monthlyPlanMM).toFixed(2)}MM</p></Card>
                <Card><p className="text-sm text-gray-500">계획 이행률</p><p className="text-2xl font-bold">{monthlyPA.toFixed(1)}%</p></Card>
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="월간 Burn-up (MM)">
                    <BurnupChart data={burnupData} />
                </Card>
                <WeeklyOverloadCard overloads={weeklyOverload} scope="personal" />
             </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="프로젝트별 계획 (Top 5)">
                    <ProjectBarChart data={projectBreakdown} />
                </Card>
                <Card title="다가오는 마감일 (45일 내)">
                    {upcomingDeadlines && upcomingDeadlines.length > 0 ? (
                        <ul className="space-y-2">
                            {upcomingDeadlines.map(p => (
                                <li key={p.id} className="text-sm flex justify-between">
                                    <span>{p.name}</span>
                                    <span className="font-semibold">{p.dueDate}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500">다가오는 마감일이 없습니다.</p>
                    )}
                </Card>
            </div>
        </div>
    );
};

const TeamDashboard: React.FC<{ data: DashboardPageData & { scope: 'team' } }> = ({ data }) => {
    const { monthlyPlanMM, monthlyActualMM, monthlyPA, teamSummary, burnupData, weeklyOverload } = data;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card><p className="text-sm text-gray-500">팀 계획 (월)</p><p className="text-2xl font-bold">{monthlyPlanMM.toFixed(2)}MM</p></Card>
                <Card><p className="text-sm text-gray-500">팀 실투입 (월)</p><p className="text-2xl font-bold">{monthlyActualMM.toFixed(2)}MM</p></Card>
                <Card><p className="text-sm text-gray-500">팀 계획 이행률</p><p className="text-2xl font-bold">{monthlyPA.toFixed(1)}%</p></Card>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="팀 월간 Burn-up (MM)">
                    <BurnupChart data={burnupData} />
                </Card>
                <WeeklyOverloadCard overloads={weeklyOverload} scope="team" />
            </div>
             <div className="grid grid-cols-1">
                <Card title="팀원별 요약">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-2 text-left font-semibold">팀원</th>
                                    <th className="p-2 text-right font-semibold">Plan (MM)</th>
                                    <th className="p-2 text-right font-semibold">Actual (MM)</th>
                                    <th className="p-2 text-right font-semibold">PA (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamSummary?.map(member => (
                                    <tr key={member.userId} className="border-b">
                                        <td className="p-2">{member.userName}</td>
                                        <td className="p-2 text-right">{member.planMM.toFixed(2)}</td>
                                        <td className="p-2 text-right">{member.actualMM.toFixed(2)}</td>
                                        <td className="p-2 text-right">{member.pa.toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};


const DashboardPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [data, setData] = useState<DashboardPageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));

    const activeTab = (searchParams.get('tab') || 'personal') as 'personal' | 'team';

    useEffect(() => {
        setLoading(true);
        setData(null);
        api.getDashboardPageData(activeTab, CURRENT_USER.id, month).then(result => {
            setData(result);
            setLoading(false);
        });
    }, [activeTab, month]);
    
    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMonth(e.target.value);
    };

    const renderContent = () => {
        if (loading) {
            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {Array(4).fill(0).map((_, i) => <Card key={i}><SkeletonLoader className="h-20" /></Card>)}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card><SkeletonLoader className="h-80" /></Card>
                        <Card><SkeletonLoader className="h-80" /></Card>
                    </div>
                </div>
            );
        }
        if (!data) return <p>No data available.</p>;

        if (data.scope === 'personal') {
            return <MyDashboard data={data} />;
        }
        if (data.scope === 'team') {
            return <TeamDashboard data={data} />;
        }
        return null;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                 <input 
                    type="month"
                    value={month}
                    onChange={handleMonthChange}
                    className="border-gray-300 rounded-md shadow-sm"
                />
            </div>
            <Tabs tabs={TABS} defaultTab="personal" />
            <div className="pt-4">
                {renderContent()}
            </div>
        </div>
    );
};

export default DashboardPage;
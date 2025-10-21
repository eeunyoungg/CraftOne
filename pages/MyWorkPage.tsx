import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, addDays } from 'date-fns';
import Tabs from '../components/Tabs';
import Card from '../components/Card';
import SkeletonLoader from '../components/SkeletonLoader';
import { api } from '../services/mockApi';
import { parseWorkReport } from '../services/geminiService';
// FIX: Removed FinalizeProposal as it's not used.
import { MyWorkSummary, Project, ParsedWorkLog, Worklog, WorklogStatus, ProjectStatus } from '../types';
import { CURRENT_USER, APP_COLORS } from '../constants';
import { ProjectBarChart } from '../components/charts/DashboardCharts';
import Icon from '../components/Icon';

const TABS = [
  { key: 'summary', label: '요약' },
  { key: 'start', label: '계획 입력' },
  { key: 'done', label: '완료 입력' },
  { key: 'reconcile', label: '주간 정산' },
];

const SummaryTab: React.FC<{ onNavigate: (tab: string, date?: string) => void }> = ({ onNavigate }) => {
    const [summary, setSummary] = useState<MyWorkSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getMyWorkSummary(CURRENT_USER.id, format(new Date(), 'yyyy-MM')).then(data => {
            setSummary(data);
            setLoading(false);
        });
    }, []);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {loading ? Array(5).fill(0).map((_, i) => <Card key={i}><SkeletonLoader className="h-20" /></Card>) : summary && (
                    <>
                        <Card><p className="text-sm text-gray-500">계획 (월)</p><p className="text-2xl font-bold">{summary.monthlyPlanMM.toFixed(1)}MM</p></Card>
                        <Card><p className="text-sm text-gray-500">실투입 (월)</p><p className="text-2xl font-bold">{summary.monthlyActualMM.toFixed(1)}MM</p></Card>
                        <Card><p className="text-sm text-gray-500">차이</p><p className={`text-2xl font-bold ${summary.monthlyDeltaH > 0 ? 'text-danger' : 'text-success'}`}>{(summary.monthlyActualMM - summary.monthlyPlanMM).toFixed(1)}MM</p></Card>
                        <Card><p className="text-sm text-gray-500">계획 이행률</p><p className="text-2xl font-bold">{summary.monthlyPA.toFixed(1)}%</p></Card>
                        <Card><p className="text-sm text-gray-500">Direct 비중</p><p className="text-2xl font-bold">{summary.monthlyDirectShare.toFixed(1)}%</p></Card>
                    </>
                )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="프로젝트별 공수 (Top 5)">
                    {loading ? <SkeletonLoader className="h-[300px]" /> : <ProjectBarChart data={summary?.projectBreakdown || []} />}
                </Card>
                <Card title="주간 패널">
                    {loading ? <SkeletonLoader className="h-[300px]" /> : summary && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-500">이번 주 계획</p>
                                <p className="text-xl font-semibold">{summary.weeklyPlanH.toFixed(1)}h</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">이번 주 실투입</p>
                                <p className="text-xl font-semibold">{summary.weeklyActualH.toFixed(1)}h</p>
                            </div>
                             <div>
                                <p className="text-sm text-gray-500">잔여</p>
                                <p className="text-xl font-semibold">{summary.weeklyRemainingH.toFixed(1)}h</p>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

const TimeBlockSelector: React.FC<{ hours: number; onHoursChange: (h: number) => void; maxHours?: number }> = ({ hours, onHoursChange, maxHours = 8 }) => {
    const blocks = Array.from({ length: maxHours * 2 }, (_, i) => (i + 1) * 0.5);
    return (
        <div className="flex flex-wrap gap-1 items-center">
            {blocks.map(h => (
                <button
                    key={h}
                    type="button"
                    onClick={() => onHoursChange(h)}
                    className={`h-5 w-5 rounded-sm ${hours >= h ? 'bg-primary' : 'bg-gray-200'}`}
                    aria-label={`${h} hours`}
                />
            ))}
            <span className="ml-2 text-sm font-semibold w-12 text-right">{hours.toFixed(1)}h</span>
        </div>
    );
};

const WorklogListEditor: React.FC<{ logs: Partial<Worklog>[]; setLogs: React.Dispatch<React.SetStateAction<Partial<Worklog>[]>>; projects: Project[]; type: 'plan' | 'actual' }> = ({ logs, setLogs, projects, type }) => {
    const handleLogChange = (index: number, field: keyof Worklog, value: any) => {
        const newLogs = [...logs];
        newLogs[index] = { ...newLogs[index], [field]: value };
        setLogs(newLogs);
    };

    const addRow = () => {
        setLogs([...logs, { projectId: '', [type === 'plan' ? 'planH' : 'actualH']: 0, task: '' }]);
    };
    
    const removeRow = (index: number) => {
        setLogs(logs.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            {logs.map((log, index) => (
                <div key={log.id || `new-${index}`} className="grid grid-cols-12 gap-3 items-start p-3 border rounded-md">
                    <select
                        value={log.projectId}
                        onChange={(e) => handleLogChange(index, 'projectId', e.target.value)}
                        className="col-span-3 rounded-md border-gray-300 shadow-sm text-sm"
                    >
                        <option value="">프로젝트 선택</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <textarea
                        value={log.task || ''}
                        onChange={(e) => handleLogChange(index, 'task', e.target.value)}
                        rows={1}
                        className="col-span-5 rounded-md border-gray-300 shadow-sm text-sm"
                        placeholder="업무 내용"
                    />
                    <div className="col-span-3">
                         <TimeBlockSelector
                            hours={type === 'plan' ? (log.planH || 0) : (log.actualH || 0)}
                            onHoursChange={(h) => handleLogChange(index, type === 'plan' ? 'planH' : 'actualH', h)}
                        />
                    </div>
                    <button type="button" onClick={() => removeRow(index)} className="col-span-1 text-gray-400 hover:text-danger">
                        <Icon name="trash" className="h-5 w-5 mx-auto" />
                    </button>
                </div>
            ))}
            <button type="button" onClick={addRow} className="text-sm text-primary font-semibold">+ 행 추가</button>
        </div>
    );
};


const AiWorklogImporter: React.FC<{ projects: Project[]; onImport: (logs: Partial<Worklog>[]) => void; context: 'plan' | 'actual' }> = ({ projects, onImport, context }) => {
    const [reportText, setReportText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const handleParse = async () => {
        if (!reportText.trim() || projects.length === 0) return;
        setIsLoading(true);
        setError('');
        try {
            const parsed = await parseWorkReport(reportText, projects, context);
            const worklogs: Partial<Worklog>[] = parsed.map(p => {
                const project = projects.find(proj => proj.name === p.projectName);
                return {
                    projectId: project?.id || '',
                    task: p.task,
                    [context === 'plan' ? 'planH' : 'actualH']: p.hours,
                };
            });
            onImport(worklogs);
            setReportText('');
        } catch (e) {
            // FIX: The error object `e` in a catch block is of type `unknown` and cannot be directly used as a string. Check if `e` is an instance of Error to safely access its `message` property. This prevents a TypeScript error and provides better error feedback.
            setError(e instanceof Error ? e.message : 'Parsing failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const title = context === 'plan' ? 'AI 계획 분석' : 'AI 완료내역 분석';
    const placeholder = context === 'plan' ? "예: 알파프로젝트 기획 4h, 브라보 프로젝트 디자인 리뷰 3h" : "예: 알파 프로젝트 기획서 초안 작성 3h, 브라보 프로젝트 고객 미팅 및 회의록 정리 4h";
    const buttonText = context === 'plan' ? 'AI로 계획 가져오기' : 'AI로 완료내역 가져오기';

    return (
        <Card>
            <p className="text-gray-700 font-semibold">{title}</p>
            <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={4}
                className="w-full p-2 border rounded-md mt-2"
                placeholder={placeholder}
                disabled={isLoading}
            />
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
            <div className="mt-2 text-right">
                <button onClick={handleParse} disabled={isLoading || !reportText.trim()} className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                    {isLoading ? '분석 중...' : buttonText}
                </button>
            </div>
        </Card>
    );
};

const StartTab: React.FC<{ date: string }> = ({ date }) => {
    const [logs, setLogs] = useState<Partial<Worklog>[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    
    useEffect(() => { api.getProjects().then(setProjects) }, []);
    useEffect(() => {
        setLogs([]); // Clear previous date's logs
        api.getWorklogs(CURRENT_USER.id, date, date).then(data => setLogs(data.filter(d => d.planH)));
    }, [date]);

    const handleSave = async () => {
        const logsToSave = logs.map(l => ({ ...l, date, userId: CURRENT_USER.id, status: WorklogStatus.DRAFT, source: 'manual' as const }));
        await api.createOrUpdateWorklogs(logsToSave as Worklog[]);
        alert("계획이 저장되었습니다.");
    };

    const totalHours = logs.reduce((sum, log) => sum + (log.planH || 0), 0);

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold">{date} 계획 입력</h2>
            <AiWorklogImporter projects={projects} onImport={setLogs} context="plan" />
            <Card title="계획 목록">
                <WorklogListEditor logs={logs} setLogs={setLogs} projects={projects} type="plan" />
            </Card>
            <div className="flex justify-end items-center gap-4">
                <span className="font-bold text-lg">총 계획: {totalHours.toFixed(1)}h</span>
                <button onClick={handleSave} className="px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-blue-700">저장</button>
            </div>
        </div>
    );
};

const DoneTab: React.FC<{ date: string }> = ({ date }) => {
    const [logs, setLogs] = useState<Partial<Worklog>[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    useEffect(() => { api.getProjects().then(setProjects) }, []);
    useEffect(() => {
        setLogs([]); // Clear previous date's logs
        api.getWorklogs(CURRENT_USER.id, date, date).then(data => setLogs(data.filter(d => d.actualH || d.planH)));
    }, [date]);

    const handleSave = async () => {
        const logsToSave = logs.map(l => ({ ...l, date, userId: CURRENT_USER.id, status: WorklogStatus.CONFIRMED, source: 'manual' as const }));
        await api.createOrUpdateWorklogs(logsToSave as Worklog[]);
        alert("완료 내역이 저장되었습니다.");
    };

    const totalHours = logs.reduce((sum, log) => sum + (log.actualH || 0), 0);

    return (
         <div className="space-y-6">
            <h2 className="text-lg font-semibold">{date} 완료 입력</h2>
            <AiWorklogImporter projects={projects} onImport={(newLogs) => setLogs(prev => [...prev, ...newLogs])} context="actual" />
            <Card title="완료 목록">
                <WorklogListEditor logs={logs} setLogs={setLogs} projects={projects} type="actual" />
            </Card>
            <div className="flex justify-end items-center gap-4">
                <span className="font-bold text-lg">총 완료: {totalHours.toFixed(1)}h</span>
                <button onClick={handleSave} className="px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-blue-700">저장</button>
            </div>
        </div>
    );
};

const ReconcileTab: React.FC<{ date: string }> = ({ date }) => {
    const [worklogs, setWorklogs] = useState<Worklog[]>([]);
    const [allProjects, setAllProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newItem, setNewItem] = useState<Partial<Worklog>>({ date: '', projectId: '', task: '', actualH: 0 });

    const { weekStart, weekEnd } = useMemo(() => {
        const parsedDate = parseISO(date);
        const start = startOfWeek(parsedDate, { weekStartsOn: 1 });
        const end = endOfWeek(parsedDate, { weekStartsOn: 1 });
        return { weekStart: start, weekEnd: end };
    }, [date]);

    const weekDays = useMemo(() => 
        eachDayOfInterval({ start: weekStart, end: weekEnd }),
        [weekStart, weekEnd]
    );

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [projData, logData] = await Promise.all([
                api.getAllProjects(),
                api.getWorklogs(CURRENT_USER.id, format(weekStart, 'yyyy-MM-dd'), format(weekEnd, 'yyyy-MM-dd'))
            ]);
            setAllProjects(projData);
            setWorklogs(logData);
        } catch (err) {
            console.error("Failed to fetch reconciliation data:", err);
            setError("데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        } finally {
            setLoading(false);
        }
    }, [weekStart, weekEnd]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const tableData = useMemo(() => {
        if (loading || error || allProjects.length === 0) {
            return { rows: [], dailyTotals: [], weeklyGrandTotal: 0 };
        }

        const projectMap = new Map<string, Project>(allProjects.map(p => [p.id, p]));
        const weeklyProjectIds = Array.from(new Set(worklogs.map(l => l.projectId)));
        
        const rows = weeklyProjectIds.map(projectId => {
            const project = projectMap.get(projectId);
            if (!project) return null;

            const dailyHours = weekDays.map(day => {
                const dayStr = format(day, 'yyyy-MM-dd');
                return worklogs
                    .filter(l => l.projectId === projectId && l.date === dayStr)
                    .reduce((sum, l) => sum + (l.actualH || 0), 0);
            });
            const weeklyTotal = dailyHours.reduce((sum, h) => sum + h, 0);

            return { project, dailyHours, weeklyTotal };
        }).filter(Boolean) as { project: Project; dailyHours: number[]; weeklyTotal: number }[];
        
        rows.sort((a, b) => a.project.name.localeCompare(b.project.name));

        const dailyTotals = weekDays.map((_, dayIndex) => 
            rows.reduce((sum, row) => sum + row.dailyHours[dayIndex], 0)
        );

        const weeklyGrandTotal = dailyTotals.reduce((sum, h) => sum + h, 0);

        return { rows, dailyTotals, weeklyGrandTotal };

    }, [loading, error, worklogs, allProjects, weekDays]);

    
    const handleAddItem = () => {
        if (!newItem.date || !newItem.projectId || !newItem.actualH) {
            alert("날짜, 프로젝트, 시간을 모두 입력해주세요.");
            return;
        }
        const newLog: Worklog = {
            id: `new-${Date.now()}`, // Temporary ID for local state
            userId: CURRENT_USER.id,
            status: WorklogStatus.CONFIRMED,
            source: 'manual',
            ...newItem
        } as Worklog;
        
        setWorklogs(prev => [...prev, newLog]);
        setNewItem({ date: '', projectId: '', task: '', actualH: 0 });
    };

    const handleSaveChanges = async () => {
        await api.createOrUpdateWorklogs(worklogs);
        alert("주간 정산 내역이 저장되었습니다.");
        fetchData(); 
    };

    const renderContent = () => {
        if (loading) return <SkeletonLoader className="h-96" />;
        if (error) return <div className="text-center py-20 text-danger"><p>{error}</p></div>;
        if (tableData.rows.length === 0) {
            return (
                <div className="text-center py-20 text-gray-500">
                    <p>해당 주에 기록된 작업이 없습니다.</p>
                    <p className="text-sm mt-2">아래 '빠뜨린 항목 추가'를 통해 직접 추가할 수 있습니다.</p>
                </div>
            );
        }
        return (
            <table className="min-w-full text-sm border">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="p-2 border text-left">프로젝트</th>
                        {weekDays.map(day => <th key={day.toISOString()} className="p-2 border">{format(day, 'MM-dd (E)')}</th>)}
                        <th className="p-2 border">주간 합계</th>
                    </tr>
                </thead>
                <tbody>
                    {tableData.rows.map(({ project, dailyHours, weeklyTotal }) => (
                        <tr key={project.id}>
                            <td className="p-2 border font-medium">
                                {project.name}
                                {project.status === ProjectStatus.ARCHIVED && (
                                    <span className="ml-2 text-xs text-gray-500 font-normal">(Archived)</span>
                                )}
                            </td>
                            {dailyHours.map((hours, i) => (
                                <td key={`${project.id}-${i}`} className="p-2 border text-center">
                                    {hours > 0 ? hours.toFixed(1) : '—'}
                                </td>
                            ))}
                            <td className="p-2 border text-center font-bold">{weeklyTotal.toFixed(1)}h</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                    <tr>
                        <td className="p-2 border text-left">총계</td>
                        {tableData.dailyTotals.map((total, i) => (
                             <td key={`total-${i}`} className="p-2 border text-center">
                                {total > 0 ? total.toFixed(1) : '—'}
                            </td>
                        ))}
                        <td className="p-2 border text-center">{tableData.weeklyGrandTotal.toFixed(1)}h</td>
                    </tr>
                </tfoot>
            </table>
        );
    };

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold">{format(weekStart, 'yyyy-MM-dd')} ~ {format(weekEnd, 'yyyy-MM-dd')} 주간 정산</h2>
            <Card>
                <div className="overflow-x-auto">
                    {renderContent()}
                </div>
            </Card>

            <Card title="빠뜨린 항목 추가">
                <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-2">
                        <select
                            value={newItem.date}
                            onChange={(e) => setNewItem(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full rounded-md border-gray-300 shadow-sm text-sm"
                        >
                            <option value="">날짜 선택</option>
                            {weekDays.map(day => <option key={day.toISOString()} value={format(day, 'yyyy-MM-dd')}>{format(day, 'MM-dd (E)')}</option>)}
                        </select>
                    </div>
                     <div className="col-span-3">
                        <select
                           value={newItem.projectId}
                           onChange={(e) => setNewItem(prev => ({ ...prev, projectId: e.target.value }))}
                           className="w-full rounded-md border-gray-300 shadow-sm text-sm"
                        >
                            <option value="">프로젝트 선택</option>
                            {allProjects.filter(p => p.status !== ProjectStatus.ARCHIVED).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="col-span-3">
                         <input
                            type="text"
                            placeholder="업무 내용 (선택)"
                            value={newItem.task || ''}
                            onChange={(e) => setNewItem(prev => ({ ...prev, task: e.target.value }))}
                            className="w-full rounded-md border-gray-300 shadow-sm text-sm"
                        />
                    </div>
                    <div className="col-span-3">
                        <TimeBlockSelector
                            hours={newItem.actualH || 0}
                            onHoursChange={(h) => setNewItem(prev => ({ ...prev, actualH: h }))}
                        />
                    </div>
                    <div className="col-span-1">
                        <button onClick={handleAddItem} className="p-2 w-full text-sm font-semibold text-white bg-primary rounded-md hover:bg-blue-700">
                           추가
                        </button>
                    </div>
                </div>
            </Card>
            
            <div className="text-right">
                <button onClick={handleSaveChanges} className="px-6 py-2 font-semibold text-white bg-success rounded-md hover:bg-green-700">
                    주간 정산 저장
                </button>
            </div>
        </div>
    );
};

const MyWorkPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const activeTab = searchParams.get('tab') || 'summary';
  const activeDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

  const handleNavigate = (tab: string, date?: string) => {
      const newParams: { [key: string]: string } = { tab };
      if (date) {
          newParams.date = date;
      } else {
          // Keep existing date if not provided
          const currentDate = searchParams.get('date');
          if(currentDate) newParams.date = currentDate;
      }
      setSearchParams(newParams);
  };

  const renderTabContent = () => {
    switch(activeTab) {
      case 'summary': return <SummaryTab onNavigate={handleNavigate} />;
      case 'start': return <StartTab date={activeDate} />;
      case 'done': return <DoneTab date={activeDate} />;
      case 'reconcile': return <ReconcileTab date={activeDate} />;
      default: return <SummaryTab onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">My Work</h1>
        <input 
            type="date"
            value={activeDate}
            onChange={(e) => handleNavigate(activeTab, e.target.value)}
            className="border-gray-300 rounded-md shadow-sm"
        />
      </div>
      <Tabs tabs={TABS} defaultTab="summary" />
      <div className="pt-4">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default MyWorkPage;
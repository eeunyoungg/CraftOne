import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { api } from '../services/mockApi';
import { UnifiedResourceResponse, UnifiedResourceRow, RowType } from '../types';
import Card from '../components/Card';
import SkeletonLoader from '../components/SkeletonLoader';
import Icon from '../components/Icon';

const getRowStyle = (rowType: RowType, parentId?: string): string => {
    switch (rowType) {
        case 'summary':
            return 'bg-gray-100 font-bold text-gray-900';
        case 'project':
        case 'person':
            return 'bg-gray-50 font-semibold text-gray-800';
        case 'personInProject':
             return 'hover:bg-blue-50';
        case 'direct':
            return 'hover:bg-purple-50';
        default:
            return 'hover:bg-gray-50';
    }
};

const getDeltaColor = (deltaMM?: number): string => {
    if (deltaMM === undefined) return 'text-gray-500';
    if (deltaMM > 0) return 'text-danger font-bold';
    if (deltaMM < 0) return 'text-primary';
    return 'text-gray-500';
};

interface NameCellProps {
    row: UnifiedResourceRow;
    onToggle: (id: string) => void;
    isExpanded: boolean;
    hasChildren: boolean;
}

const NameCell: React.FC<NameCellProps> = ({ row, onToggle, isExpanded, hasChildren }) => {
    const isExpandable = hasChildren;
    const indentLevel = row.parentId ? 1 : 0;

    return (
        <div className="flex items-center" style={{ paddingLeft: `${indentLevel * 1.5}rem` }}>
            {isExpandable ? (
                <button onClick={() => onToggle(row.rowId)} className="mr-2 text-gray-500 hover:text-gray-800">
                    <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} className="h-4 w-4" />
                </button>
            ) : (
                 <div className="w-4 h-4 mr-2 flex-shrink-0">
                    {row.rowType === 'direct' && <span className="text-direct">●</span>}
                 </div>
            )}
            {row.person ? (
                <div className="flex items-center">
                    <img src={row.person.avatar} alt={row.person.name} className="h-6 w-6 rounded-full mr-2" />
                    <span>{row.person.name}</span>
                </div>
            ) : (
                <span>{row.name}</span>
            )}
        </div>
    );
};

const MonthlyGaugeCell: React.FC<{ planMM: number; groupBy: 'person' | 'project', month: string }> = ({ planMM, groupBy, month }) => {
    if (groupBy === 'project') {
        return (
            <div className="text-center text-sm text-gray-700">
                {planMM > 0 ? planMM.toFixed(1) : '—'}
            </div>
        );
    }

    const currentMonthStr = format(new Date(), 'yyyy-MM');
    const isPastMonth = month < currentMonthStr;

    // Person Grouped View (Gauge)
    if (planMM === 0) {
        return <div className="text-center text-xs text-gray-400">Released</div>;
    }

    const MAX_GAUGE_MM = 1.0; // A standard full-time person is 1 MM.
    const percentage = (planMM / MAX_GAUGE_MM) * 100;
    
    let barColor = 'bg-primary';
    if (percentage > 100) {
        barColor = 'bg-danger';
    }

    if (isPastMonth) {
        barColor = 'bg-gray-400';
    }

    return (
         <div className={`relative h-6 w-full ${isPastMonth ? 'bg-gray-300' : 'bg-gray-200'} rounded-sm overflow-hidden`} title={`Plan: ${planMM.toFixed(1)} MM`}>
            <div
                className={`absolute top-0 left-0 h-full ${barColor}`}
                style={{ width: `${Math.min(100, percentage)}%` }}
            />
            <div className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${isPastMonth ? 'text-gray-600' : 'text-white mix-blend-difference'}`}>
                {planMM.toFixed(1)} MM
            </div>
        </div>
    );
};

const ResourcesPage: React.FC = () => {
    const [data, setData] = useState<UnifiedResourceResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [year, setYear] = useState(2025);
    const [groupBy, setGroupBy] = useState<'person' | 'project'>('person');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [showReleases, setShowReleases] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const result = await api.getUnifiedResourcesYearly({ year, group: groupBy });
            setData(result);
            // Default to all expanded on new data load
            // FIX: Explicitly type the Set to string to resolve type inference issue.
            const parentIds = new Set<string>(result.rows.filter(r => !r.parentId).map(r => r.rowId));
            setExpandedRows(parentIds);
        } catch (error) {
            console.error("Failed to fetch resources:", error);
        } finally {
            setLoading(false);
        }
    }, [year, groupBy]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleRow = (rowId: string) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(rowId)) newSet.delete(rowId);
            else newSet.add(rowId);
            return newSet;
        });
    };

    const expandAll = () => {
        if (!data) return;
        // FIX: Explicitly type the Set to string to resolve type inference issue.
        const allParentIds = new Set<string>(data.rows.filter(r => childrenMap.has(r.rowId)).map(r => r.rowId));
        setExpandedRows(allParentIds);
    };

    const collapseAll = () => {
        setExpandedRows(new Set());
    };

    const childrenMap = useMemo(() => {
        const map = new Map<string, UnifiedResourceRow[]>();
        if (!data) return map;
        data.rows.forEach(row => {
            if (row.parentId) {
                if (!map.has(row.parentId)) map.set(row.parentId, []);
                map.get(row.parentId)!.push(row);
            }
        });
        return map;
    }, [data]);

    const visibleRows = useMemo(() => {
        if (!data) return [];
        const result: UnifiedResourceRow[] = [];
        
        const addChildren = (parentId: string) => {
            if (expandedRows.has(parentId)) {
                const children = childrenMap.get(parentId) || [];
                children.forEach(child => {
                    result.push(child);
                    addChildren(child.rowId);
                });
            }
        };
        
        data.rows.forEach(row => {
            if (!row.parentId) {
                result.push(row);
                addChildren(row.rowId);
            }
        });
        
        return result;
    }, [data, expandedRows, childrenMap]);

    const renderTable = () => {
        if (loading) return <SkeletonLoader className="h-96 w-full" />;
        if (!data) return <div className="text-center py-16 text-gray-500">No data available.</div>;

        return (
            <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="sticky left-0 bg-gray-50 z-10 p-2 border-b text-left w-64">
                            {groupBy === 'person' ? 'Person' : 'Project'}
                        </th>
                        <th className="p-2 border-b text-right w-24">Plan (MM)</th>
                        <th className="p-2 border-b text-right w-24">Actual (MM)</th>
                        <th className="p-2 border-b text-right w-24">Δ (MM)</th>
                        {showReleases && <>
                            <th className="p-2 border-b text-left w-32">Release</th>
                            <th className="p-2 border-b text-center w-24">Due</th>
                            <th className="p-2 border-b text-center w-28">Prog</th>
                            <th className="p-2 border-b text-center w-16">D+</th>
                        </>}
                        {data.meta.monthColumns.map(month => (
                            <th key={month} className="p-2 border-b text-center w-32">{month}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {visibleRows.map(row => {
                        const hasChildren = childrenMap.has(row.rowId);
                        const isExpanded = expandedRows.has(row.rowId);
                        const deltaMM = (row.actualMM ?? 0) - (row.planMM ?? 0);
                        
                        return (
                            <tr key={row.rowId} className={`${getRowStyle(row.rowType, row.parentId)} border-b border-gray-200`}>
                                <td className="sticky left-0 bg-inherit z-10 p-2 whitespace-nowrap">
                                    <NameCell row={row} onToggle={toggleRow} isExpanded={isExpanded} hasChildren={hasChildren} />
                                </td>
                                <td className="p-2 text-right">{row.planMM?.toFixed(1) ?? '—'}</td>
                                <td className="p-2 text-right">{row.actualMM?.toFixed(1) ?? '—'}</td>
                                <td className={`p-2 text-right ${getDeltaColor(deltaMM)}`}>{deltaMM.toFixed(1) ?? '—'}</td>
                                {showReleases && <>
                                    <td className="p-2 whitespace-nowrap">{row.release?.name || '—'}</td>
                                    <td className={`p-2 text-center whitespace-nowrap ${row.release?.lateDays && row.release.lateDays > 0 ? 'text-danger' : ''}`}>{row.release?.due || '—'}</td>
                                    <td className="p-2">
                                        {row.release ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs">{row.release.closed}/{row.release.total}</span>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div className="bg-primary h-2 rounded-full" style={{ width: `${(row.release.closed / row.release.total) * 100}%` }}></div>
                                                </div>
                                            </div>
                                        ) : '—'}
                                    </td>
                                    <td className="p-2 text-center">
                                        {row.release?.lateDays && row.release.lateDays > 0 && 
                                            <span className="px-2 py-0.5 text-xs font-semibold text-white bg-danger rounded-full">D+{row.release.lateDays}</span>
                                        }
                                    </td>
                                </>}
                                {row.planMonths.map((planVal, i) => (
                                    <td key={i} className="p-1.5 text-center">
                                       <MonthlyGaugeCell planMM={planVal} groupBy={groupBy} month={data.meta.monthColumns[i]} />
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    };

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-bold text-gray-900">Resources</h1>
            <Card>
                <div className="p-4 flex flex-wrap justify-between items-center border-b gap-4">
                    <div className="flex items-center gap-4 flex-wrap">
                        <label className="flex items-center gap-2">
                            <span className="text-sm font-medium">Year:</span>
                            <select value={year} onChange={(e) => setYear(parseInt(e.target.value, 10))} className="p-1 border rounded-md text-sm">
                                {[2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </label>
                         <div>
                            <span className="isolate inline-flex rounded-md shadow-sm">
                                <button type="button" onClick={() => setGroupBy('person')} className={`relative inline-flex items-center rounded-l-md px-3 py-1.5 text-sm font-semibold ${groupBy === 'person' ? 'bg-primary text-white' : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}>
                                    Group by Person
                                </button>
                                <button type="button" onClick={() => setGroupBy('project')} className={`relative -ml-px inline-flex items-center rounded-r-md px-3 py-1.5 text-sm font-semibold ${groupBy === 'project' ? 'bg-primary text-white' : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}>
                                    Group by Project
                                </button>
                            </span>
                        </div>
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={showReleases} onChange={(e) => setShowReleases(e.target.checked)} />
                            <span className="text-sm">릴리즈정보</span>
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                         <button onClick={expandAll} className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white border rounded-md hover:bg-gray-50">전체 펼치기</button>
                         <button onClick={collapseAll} className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-white border rounded-md hover:bg-gray-50">전체 닫기</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {renderTable()}
                </div>
            </Card>
        </div>
    );
};

export default ResourcesPage;
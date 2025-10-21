import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, subMonths } from 'date-fns';
import { api } from '../services/mockApi';
import { generateMonthlyEvaluationReport, generateAnnualEvaluationReport } from '../services/geminiService';
import { Evaluation, User, EvaluationCriterionKey, EvaluationStatus } from '../types';
import { TEAM_MEMBERS, CURRENT_USER, EVALUATION_CRITERIA_KEYS, EVALUATION_CRITERIA_LABELS } from '../constants';
import Card from '../components/Card';
import SkeletonLoader from '../components/SkeletonLoader';
import Tabs from '../components/Tabs';

const TABS = [
  { key: 'monthly', label: '월간 리포트' },
  { key: 'yearly', label: '연간 리포트' },
];

const SCORES = [5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1];

const MonthlyReportTab: React.FC<{ selectedUserId: string; month: string; }> = ({ selectedUserId, month }) => {
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.getEvaluation(selectedUserId, month);
            setEvaluation(data);
        } catch (error) {
            console.error("Failed to fetch evaluation data:", error);
            setEvaluation(null);
        } finally {
            setLoading(false);
        }
    }, [selectedUserId, month]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleGenerateReport = async () => {
        if (!evaluation) return;
        setIsGenerating(true);
        try {
            const selectedUser = TEAM_MEMBERS.find(u => u.id === selectedUserId);
            const reportData = await generateMonthlyEvaluationReport(evaluation, selectedUser?.name || 'Team Member');
            
            setEvaluation(prev => {
                if (!prev) return null;
                
                const newCriteria = { ...prev.criteria };
                EVALUATION_CRITERIA_KEYS.forEach(key => {
                    if (reportData.criteriaComments[key]) {
                        newCriteria[key] = { ...newCriteria[key], comment: reportData.criteriaComments[key] };
                    }
                });

                return {
                    ...prev,
                    criteria: newCriteria,
                    finalComment: reportData.finalComment,
                };
            });
        } catch (error) {
            alert((error as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleFieldChange = (field: keyof Evaluation, value: any) => {
        setEvaluation(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleCriteriaChange = (key: EvaluationCriterionKey, field: 'score' | 'comment', value: string | number) => {
        setEvaluation(prev => {
            if (!prev) return null;
            const newCriteria = { ...prev.criteria[key], [field]: value };
            return { ...prev, criteria: { ...prev.criteria, [key]: newCriteria } };
        });
    };

    const handleSave = async (status: EvaluationStatus) => {
        if (!evaluation) return;
        setIsSaving(true);
        try {
            await api.saveEvaluation({ ...evaluation, status });
            alert(`평가결과가 '${status}' 상태로 저장되었습니다.`);
            fetchData();
        } catch (error) {
            alert('저장에 실패했습니다.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderMetrics = () => {
        if (!evaluation) return null;
        const { metrics } = evaluation;
        return (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div><p className="text-sm text-gray-500">계획</p><p className="font-semibold">{metrics.planMM.toFixed(2)}MM</p></div>
                <div><p className="text-sm text-gray-500">실투입</p><p className="font-semibold">{metrics.actualMM.toFixed(2)}MM</p></div>
                <div><p className="text-sm text-gray-500">차이</p><p className={`font-semibold ${metrics.deltaMM < 0 ? 'text-primary' : 'text-danger'}`}>{metrics.deltaMM.toFixed(2)}MM</p></div>
                <div><p className="text-sm text-gray-500">달성률</p><p className="font-semibold">{metrics.pa.toFixed(1)}%</p></div>
                <div><p className="text-sm text-gray-500">Direct 비중</p><p className="font-semibold">{metrics.directShare.toFixed(1)}%</p></div>
            </div>
        );
    };

    const renderCriteria = () => {
        if (!evaluation) return null;
        return (
            <div className="space-y-4">
                {EVALUATION_CRITERIA_KEYS.map(key => (
                    <div key={key} className="grid grid-cols-12 gap-4 items-start">
                        <label className="col-span-2 font-semibold text-sm py-2">{EVALUATION_CRITERIA_LABELS[key]}</label>
                        <div className="col-span-2">
                            <select
                                value={evaluation.criteria[key].score}
                                onChange={(e) => handleCriteriaChange(key, 'score', parseFloat(e.target.value))}
                                className="w-full rounded-md border-gray-300 shadow-sm"
                            >
                                {SCORES.map(s => <option key={s} value={s}>{s.toFixed(1)}점</option>)}
                            </select>
                        </div>
                        <div className="col-span-8">
                            <textarea
                                rows={2}
                                value={evaluation.criteria[key].comment}
                                onChange={(e) => handleCriteriaChange(key, 'comment', e.target.value)}
                                className="w-full rounded-md border-gray-300 shadow-sm text-sm"
                                placeholder="코멘트를 입력하세요..."
                            />
                        </div>
                    </div>
                ))}
            </div>
        );
    };
    
    if (loading) return <SkeletonLoader className="h-96" />;
    if (!evaluation) return <p className="text-center py-10">해당 월의 평가 데이터가 없습니다.</p>;
    
    return (
        <div className="space-y-6">
            <Card title="성과 요약">{renderMetrics()}</Card>
            <Card title="평가 항목">{renderCriteria()}</Card>
            <Card title="종합 의견">
                <textarea
                    rows={8}
                    value={evaluation.finalComment}
                    onChange={(e) => handleFieldChange('finalComment', e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm whitespace-pre-wrap"
                    placeholder="종합 의견을 입력하거나 AI로 생성하세요."
                />
                <div className="mt-2 text-right">
                    <button onClick={handleGenerateReport} disabled={isGenerating} className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                        {isGenerating ? 'AI 평가 생성 중...' : 'AI로 전체 평가 생성'}
                    </button>
                </div>
            </Card>
            <div className="flex justify-end gap-4">
                <button onClick={() => handleSave(EvaluationStatus.DRAFT)} disabled={isSaving} className="px-6 py-2 font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:bg-gray-200">
                    {isSaving ? '저장 중...' : '임시 저장'}
                </button>
                <button onClick={() => handleSave(EvaluationStatus.CONFIRMED)} disabled={isSaving} className="px-6 py-2 font-semibold text-white bg-success rounded-md hover:bg-green-700 disabled:bg-gray-400">
                    {isSaving ? '확정 중...' : '최종 확정'}
                </button>
            </div>
        </div>
    );
}

const AnnualReportTab: React.FC<{ selectedUserId: string; year: number; }> = ({ selectedUserId, year }) => {
    const [evaluations, setEvaluations] = useState<Evaluation[] | null>(null);
    const [report, setReport] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        setLoading(true);
        setReport('');
        api.getYearlyEvaluations(selectedUserId, year).then(data => {
            setEvaluations(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [selectedUserId, year]);

    const handleGenerate = async () => {
        if (!evaluations) return;
        setIsGenerating(true);
        try {
            const selectedUser = TEAM_MEMBERS.find(u => u.id === selectedUserId);
            const result = await generateAnnualEvaluationReport(evaluations, selectedUser?.name || 'Team Member', year);
            setReport(result);
        } catch (error) {
            setReport(`리포트 생성 오류: ${(error as Error).message}`);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card title={`${year}년 평가 데이터 요약`}>
                {loading && <SkeletonLoader className="h-24" />}
                {!loading && (!evaluations || evaluations.length === 0) && (
                    <p className="text-gray-500 text-center py-8">해당 연도의 평가 데이터가 없습니다.</p>
                )}
                {!loading && evaluations && evaluations.length > 0 && (
                    <ul className="list-disc list-inside">
                        <li>총 <strong>{evaluations.length}개월</strong>의 평가 데이터가 존재합니다.</li>
                        <li>연간 리포트 생성 버튼을 클릭하면 AI가 이 데이터를 바탕으로 종합적인 분석을 수행합니다.</li>
                    </ul>
                )}
            </Card>
            
            <div className="text-center">
                <button 
                    onClick={handleGenerate} 
                    disabled={isGenerating || loading || !evaluations || evaluations.length === 0} 
                    className="px-6 py-2 font-semibold text-white bg-primary rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                    {isGenerating ? 'AI 연간 리포트 생성 중...' : 'AI 연간 리포트 생성'}
                </button>
            </div>

            {report && (
                <Card title="AI 생성 연간 리포트">
                    <div className="prose prose-sm max-w-none whitespace-pre-wrap p-2 bg-gray-50 rounded-md">{report}</div>
                </Card>
            )}
        </div>
    );
};


const EvaluationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'monthly';
  
  const [selectedUserId, setSelectedUserId] = useState(CURRENT_USER.id);
  const [month, setMonth] = useState(format(subMonths(new Date(), 1), 'yyyy-MM'));
  const [year, setYear] = useState(new Date().getFullYear() -1);

  const renderTabContent = () => {
    switch(activeTab) {
      case 'monthly': return <MonthlyReportTab selectedUserId={selectedUserId} month={month} />;
      case 'yearly': return <AnnualReportTab selectedUserId={selectedUserId} year={year} />;
      default: return <MonthlyReportTab selectedUserId={selectedUserId} month={month} />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Evaluation</h1>
        <div className="flex items-center gap-4">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="border-gray-300 rounded-md shadow-sm"
          >
            {TEAM_MEMBERS.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
          </select>
          {activeTab === 'monthly' ? (
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border-gray-300 rounded-md shadow-sm"
            />
          ) : (
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="border-gray-300 rounded-md shadow-sm"
            >
              {[2025, 2024, 2023].map(y => <option key={y} value={y}>{y}년</option>)}
            </select>
          )}
        </div>
      </div>
      <Tabs tabs={TABS} defaultTab="monthly" />
      <div className="pt-4">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default EvaluationPage;
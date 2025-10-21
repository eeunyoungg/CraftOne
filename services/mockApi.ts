// This is a mock API service to simulate backend interactions.
// It uses in-memory data and setTimeout to mimic network latency.

import {
  Project,
  Worklog,
  User,
  MyWorkSummary,
  DashboardPageData,
  WeeklyOverload,
  Evaluation,
  PerformanceMetrics,
  UnifiedResourceResponse,
  ProjectStatus,
  ProjectType,
  WorklogStatus,
  EvaluationStatus,
  EvaluationCriterionKey,
} from '../types';
import { TEAM_MEMBERS, CURRENT_USER, HOURS_PER_MM, EVALUATION_CRITERIA_KEYS } from '../constants';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, startOfYear, getMonth, getYear, addMonths, subMonths, startOfWeek, endOfWeek, parseISO, addDays } from 'date-fns';

// --- IN-MEMORY DATABASE ---

const PROJECTS_DATA: Project[] = [
    { id: 'p-1', name: '알파 프로젝트', type: ProjectType.PROJECT, status: ProjectStatus.ACTIVE, color: '#3B82F6', assigneeIds: ['u-1', 'u-2', 'u-4'], startDate: '2025-01-01', endDate: '2025-12-31', monthlyPlan: { '2025-01': { 'u-1': 0.5, 'u-2': 0.8 }, '2025-02': { 'u-1': 0.6, 'u-2': 0.7, 'u-4': 0.2 } }, planSource: { docTitle: 'Project Alpha Plan', docVersion: 'v1.2' } },
    { id: 'p-2', name: '브라보 프로젝트', type: ProjectType.PROJECT, status: ProjectStatus.ACTIVE, color: '#10B981', assigneeIds: ['u-1', 'u-3', 'u-5'], startDate: '2025-03-01', endDate: '2025-09-30', monthlyPlan: { '2025-03': { 'u-1': 0.4, 'u-3': 1.0, 'u-5': 0.5 } }, planSource: { docTitle: 'Project Bravo Proposal', docVersion: 'v1.0' } },
    { id: 'p-3', name: '디자인 시스템', type: ProjectType.DIRECT, status: ProjectStatus.ACTIVE, color: '#8B5CF6', assigneeIds: ['u-4'], startDate: '2025-01-01', endDate: '2025-12-31', monthlyPlan: { '2025-01': {'u-4': 0.8}, '2025-02': {'u-4': 0.7} } },
    { id: 'p-4', name: '레거시 유지보수', type: ProjectType.DIRECT, status: ProjectStatus.ARCHIVED, color: '#6B7280', assigneeIds: ['u-2', 'u-5'], startDate: '2024-01-01', endDate: '2024-12-31', monthlyPlan: {} },
];

let DB_PROJECTS: Project[] = JSON.parse(JSON.stringify(PROJECTS_DATA));
let DB_WORKLOGS: Worklog[] = [];
let DB_EVALUATIONS: Evaluation[] = [];

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- API IMPLEMENTATION ---

export const api = {
    async getProjects(): Promise<Project[]> {
        await delay(300);
        return JSON.parse(JSON.stringify(DB_PROJECTS.filter(p => p.status === ProjectStatus.ACTIVE)));
    },
    
    async getAllProjects(): Promise<Project[]> {
        await delay(300);
        return JSON.parse(JSON.stringify(DB_PROJECTS));
    },

    async getProject(id: string): Promise<Project | undefined> {
        await delay(300);
        return JSON.parse(JSON.stringify(DB_PROJECTS.find(p => p.id === id)));
    },

    async createProject(project: Omit<Project, 'id'>): Promise<Project> {
        await delay(500);
        const newProject: Project = { ...project, id: `p-${Date.now()}` };
        DB_PROJECTS.push(newProject);
        return newProject;
    },

    async updateProject(project: Project): Promise<Project> {
        await delay(500);
        const index = DB_PROJECTS.findIndex(p => p.id === project.id);
        if (index !== -1) {
            DB_PROJECTS[index] = project;
            return project;
        }
        throw new Error("Project not found");
    },

    async getWorklogs(userId: string, startDate: string, endDate: string): Promise<Worklog[]> {
        await delay(200);
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        return DB_WORKLOGS.filter(w => {
            const wDate = parseISO(w.date);
            return w.userId === userId && wDate >= start && wDate <= end;
        });
    },

    async createOrUpdateWorklogs(logs: Worklog[]): Promise<Worklog[]> {
        await delay(400);
        logs.forEach(log => {
            if (log.id && !log.id.startsWith('new-')) {
                const index = DB_WORKLOGS.findIndex(w => w.id === log.id);
                if (index !== -1) DB_WORKLOGS[index] = log;
            } else {
                 DB_WORKLOGS.push({ ...log, id: `w-${Date.now()}-${Math.random()}` });
            }
        });
        return logs;
    },

    async getMyWorkSummary(userId: string, month: string): Promise<MyWorkSummary> {
        await delay(500);
        const monthDate = parseISO(`${month}-01`);
        const monthlyPlanMM = DB_PROJECTS.reduce((sum, p) => sum + (p.monthlyPlan[month]?.[userId] || 0), 0);
        // Simulate some actuals
        const monthlyActualMM = monthlyPlanMM * (0.8 + Math.random() * 0.4); 

        return {
            monthlyPlanMM,
            monthlyActualMM,
            monthlyDeltaH: (monthlyActualMM - monthlyPlanMM) * HOURS_PER_MM,
            monthlyPA: monthlyPlanMM > 0 ? (monthlyActualMM / monthlyPlanMM) * 100 : 0,
            monthlyDirectShare: 30,
            projectBreakdown: DB_PROJECTS.slice(0, 5).map(p => ({ name: p.name, value: p.monthlyPlan[month]?.[userId] || 0 })).filter(p => p.value > 0),
            weeklyPlanH: 40,
            weeklyActualH: 35,
            weeklyRemainingH: 5,
        };
    },
    
    async getDashboardPageData(scope: 'personal' | 'team', userId: string, month: string): Promise<DashboardPageData> {
        await delay(600);
        const monthDate = parseISO(`${month}-01`);

        const weeklyOverload: WeeklyOverload[] = [
            { userId: 'u-1', userName: '고은영', date: format(addDays(new Date(), 1), 'MM-dd'), dayOfWeek: '화', actualH: 9.5, capacityH: 8, overloadPct: (9.5/8)*100 },
            { userId: 'u-5', userName: '류동하', date: format(addDays(new Date(), 3), 'MM-dd'), dayOfWeek: '목', actualH: 10, capacityH: 8, overloadPct: (10/8)*100 },
        ];

        const burnupData = eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) })
            .filter((_, i) => i % 3 === 0)
            .map((day, i, arr) => ({
                name: format(day, 'MM-dd'),
                cumPlanMM: (i + 1) / arr.length * 4.5,
                cumActualMM: (i + 1) / arr.length * 4.5 * (0.8 + Math.random() * 0.3),
            }));

        const baseData = {
            monthlyPlanMM: scope === 'personal' ? 1.0 : 5.0,
            monthlyActualMM: scope === 'personal' ? 0.9 : 4.2,
            monthlyPA: scope === 'personal' ? 90 : 84,
            burnupData,
            weeklyOverload,
        };
        
        if (scope === 'personal') {
            return {
                ...baseData,
                scope: 'personal',
                projectBreakdown: DB_PROJECTS.slice(0,5).map(p => ({name: p.name, value: Math.random()})),
                upcomingDeadlines: [
                    { id: 'p-1', name: '알파 QA 시작', dueDate: format(addDays(new Date(), 20), 'yyyy-MM-dd')},
                    { id: 'p-2', name: '브라보 킥오프', dueDate: format(addDays(new Date(), 40), 'yyyy-MM-dd')},
                ]
            };
        } else {
             return {
                ...baseData,
                scope: 'team',
                teamSummary: TEAM_MEMBERS.map(m => ({
                    userId: m.id,
                    userName: m.name,
                    planMM: 1.0,
                    actualMM: 0.8 + Math.random() * 0.3,
                    pa: 80 + Math.random() * 30,
                })),
            };
        }
    },
    
    async getUnifiedResourcesYearly(params: { year: number, group: 'person' | 'project' }): Promise<UnifiedResourceResponse> {
        await delay(800);
        const { year, group } = params;
        const monthColumns = Array.from({ length: 12 }, (_, i) => format(new Date(year, i, 1), 'yyyy-MM'));

        const rows: any[] = []; // UnifiedResourceRow[]
        if (group === 'person') {
            TEAM_MEMBERS.forEach(person => {
                rows.push({
                    rowId: person.id,
                    rowType: 'person',
                    name: person.name,
                    person: { id: person.id, name: person.name, avatar: person.avatar },
                    planMM: 10.5, actualMM: 9.8,
                    planMonths: Array.from({length: 12}, () => Math.random() * 1.2),
                });
                DB_PROJECTS.filter(p => p.assigneeIds.includes(person.id)).forEach(project => {
                    rows.push({
                        rowId: `${person.id}-${project.id}`,
                        parentId: person.id,
                        rowType: 'project',
                        name: project.name,
                        planMM: 3.2, actualMM: 3.0,
                        planMonths: Array.from({length: 12}, () => Math.random() * 0.5),
                        release: { name: `${project.name} v1.2`, due: `${year}-08-15`, total: 20, closed: 15, lateDays: 5 }
                    });
                });
            });
        } else {
             DB_PROJECTS.forEach(project => {
                rows.push({
                    rowId: project.id,
                    rowType: 'project',
                    name: project.name,
                    planMM: 5.5, actualMM: 5.1,
                    planMonths: Array.from({length: 12}, () => Math.random() * 2),
                    release: { name: `${project.name} v1.2`, due: `${year}-08-15`, total: 20, closed: 15, lateDays: 0 }
                });
                project.assigneeIds.map(id => TEAM_MEMBERS.find(m => m.id === id)).forEach(person => {
                    if (!person) return;
                    rows.push({
                        rowId: `${project.id}-${person.id}`,
                        parentId: project.id,
                        rowType: 'personInProject',
                        name: person.name,
                        person: { id: person.id, name: person.name, avatar: person.avatar },
                        planMM: 1.8, actualMM: 1.7,
                        planMonths: Array.from({length: 12}, () => Math.random() * 0.5),
                    });
                });
            });
        }
        
        return {
            meta: { year, group, monthColumns },
            rows
        };
    },
    
    async getEvaluation(userId: string, month: string): Promise<Evaluation> {
        await delay(400);
        let evalData = DB_EVALUATIONS.find(e => e.userId === userId && e.month === month);
        if (!evalData) {
            // Create a dummy one if not exists
            evalData = {
                id: `eval-${userId}-${month}`,
                userId,
                month,
                status: EvaluationStatus.DRAFT,
                metrics: {
                    planMM: 1.0,
                    actualMM: 0.95,
                    deltaMM: -0.05,
                    pa: 95.0,
                    directShare: 15.2,
                    topProjects: [
                        { name: '알파 프로젝트', mm: 0.6 },
                        { name: '브라보 프로젝트', mm: 0.35 },
                    ]
                },
                criteria: EVALUATION_CRITERIA_KEYS.reduce((acc, key) => {
                    acc[key] = { score: 3 + Math.random() * 2, comment: '' };
                    return acc;
                }, {} as Record<EvaluationCriterionKey, { score: number; comment: string; }>),
                finalComment: ''
            };
        }
        return JSON.parse(JSON.stringify(evalData));
    },
    
    async saveEvaluation(evaluation: Evaluation): Promise<Evaluation> {
        await delay(500);
        const index = DB_EVALUATIONS.findIndex(e => e.id === evaluation.id);
        if (index > -1) {
            DB_EVALUATIONS[index] = evaluation;
        } else {
            DB_EVALUATIONS.push(evaluation);
        }
        return evaluation;
    },
    
    async getYearlyEvaluations(userId: string, year: number): Promise<Evaluation[]> {
        await delay(700);
        const existingEvals = DB_EVALUATIONS.filter(e => e.userId === userId && e.month.startsWith(String(year)));
        const existingMonths = new Set(existingEvals.map(e => e.month));
        const generatedEvals: Evaluation[] = [];
        for (let i = 0; i < 12; i++) {
            const month = format(new Date(year, i, 1), 'yyyy-MM');
            if (existingMonths.has(month)) continue;
            if (Math.random() > 0.6) {
                generatedEvals.push({
                    id: `eval-${userId}-${month}`,
                    userId,
                    month,
                    status: EvaluationStatus.CONFIRMED,
                    metrics: { planMM: 1.0, actualMM: 0.8 + Math.random() * 0.4, deltaMM: -0.1, pa: 90 + Math.random() * 10, directShare: 10 + Math.random() * 10, topProjects: [] },
                    criteria: EVALUATION_CRITERIA_KEYS.reduce((acc, key) => {
                        acc[key] = { score: Math.round((3 + Math.random() * 2) * 2) / 2, comment: `Comment for ${key} in ${month}` };
                        return acc;
                    }, {} as any),
                    finalComment: `Final comment for ${month}`
                });
            }
        }
        return [...existingEvals, ...generatedEvals].sort((a, b) => a.month.localeCompare(b.month));
    },
};
// FIX: Replaced incorrect component code with actual type definitions.
export interface User {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

export enum ProjectType {
  PROJECT = 'Project',
  DIRECT = 'Direct',
}

export enum ProjectStatus {
  ACTIVE = 'Active',
  ARCHIVED = 'Archived',
}

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  color: string;
  assigneeIds: string[];
  startDate: string;
  endDate: string;
  monthlyPlan: {
    [month: string]: { // e.g., '2025-01'
      [userId: string]: number; // MM value
    };
  };
  planSource?: {
    docTitle: string;
    docVersion: string;
  };
}

export enum WorklogStatus {
    DRAFT = 'Draft',
    CONFIRMED = 'Confirmed',
}

export interface Worklog {
    id: string;
    userId: string;
    projectId: string;
    date: string;
    task: string;
    planH: number;
    actualH: number;
    status: WorklogStatus;
    source: 'manual' | 'jira' | 'calendar';
}

export interface ParsedWorkLog {
    projectName: string;
    task: string;
    hours: number;
}

export interface MyWorkSummary {
    monthlyPlanMM: number;
    monthlyActualMM: number;
    monthlyDeltaH: number;
    monthlyPA: number;
    monthlyDirectShare: number;
    projectBreakdown: { name: string; value: number }[];
    weeklyPlanH: number;
    weeklyActualH: number;
    weeklyRemainingH: number;
}

export interface WeeklyOverload {
  userId: string;
  userName: string;
  date: string;
  dayOfWeek: string;
  actualH: number;
  capacityH: number;
  overloadPct: number;
}

// FIX: Converted DashboardPageData to a discriminated union type for better type-safety
// with personal and team scopes, which resolves type errors in DashboardPage.tsx.
export type DashboardPageData = {
    monthlyPlanMM: number;
    monthlyActualMM: number;
    monthlyPA: number;
    burnupData: { name: string; cumPlanMM: number; cumActualMM: number }[];
    weeklyOverload?: WeeklyOverload[];
} & (
    | {
        scope: 'personal';
        projectBreakdown: { name: string; value: number }[];
        upcomingDeadlines: { id: string; name: string; dueDate: string }[];
    }
    | {
        scope: 'team';
        teamSummary: { userId: string; userName: string; planMM: number; actualMM: number; pa: number }[];
    }
);


export type EvaluationCriterionKey = 'workPerformance' | 'taskCompletion' | 'collaboration' | 'problemSolving' | 'development' | 'workAttitude' | 'cultureFit';

export interface EvaluationCriteria {
    score: number;
    comment: string;
}

export enum EvaluationStatus {
    DRAFT = 'Draft',
    CONFIRMED = 'Confirmed'
}

export interface Evaluation {
    id: string;
    userId: string;
    month: string;
    status: EvaluationStatus;
    metrics: {
        planMM: number;
        actualMM: number;
        deltaMM: number;
        pa: number;
        directShare: number;
        topProjects: { name: string; mm: number }[];
    };
    criteria: Record<EvaluationCriterionKey, EvaluationCriteria>;
    finalComment: string;
}

export interface PerformanceMetrics {
  planMM: number;
  actualMM: number;
  pa: number;
  directShare: number;
  projectContributions: {
    projectName: string;
    contributionMM: number;
    description: string;
  }[];
}

export type RowType = 'summary' | 'project' | 'person' | 'personInProject' | 'direct';

export interface UnifiedResourceRow {
    rowId: string;
    parentId?: string;
    rowType: RowType;
    name: string;
    person?: { id: string; name: string; avatar: string; };
    planMM?: number;
    actualMM?: number;
    planMonths: number[];
    release?: {
        name: string;
        due: string;
        total: number;
        closed: number;
        lateDays?: number;
    };
}

export interface UnifiedResourceResponse {
    meta: {
        year: number;
        group: 'person' | 'project';
        monthColumns: string[];
    };
    rows: UnifiedResourceRow[];
}
import { User, EvaluationCriterionKey } from './types';

export const HOURS_PER_MM = 160;

export const TEAM_MEMBERS: User[] = [
  { id: 'u-1', name: '고은영', avatar: 'https://i.pravatar.cc/40?u=u-1', role: 'Team Lead' },
  { id: 'u-2', name: '김은지', avatar: 'https://i.pravatar.cc/40?u=u-2', role: 'Manager' },
  { id: 'u-3', name: '김정호', avatar: 'https://i.pravatar.cc/40?u=u-3', role: 'Assistant Manager' },
  { id: 'u-4', name: '이민주', avatar: 'https://i.pravatar.cc/40?u=u-4', role: 'Staff' },
  { id: 'u-5', name: '류동하', avatar: 'https://i.pravatar.cc/40?u=u-5', role: 'Staff' },
  { id: 'u-6', name: '신은영', avatar: 'https://i.pravatar.cc/40?u=u-6', role: 'Manager' },
  { id: 'u-7', name: '정소율', avatar: 'https://i.pravatar.cc/40?u=u-7', role: 'Staff' },
];

export const CURRENT_USER = TEAM_MEMBERS[0];

export const NAV_ITEMS = [
  { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { name: 'My Work', path: '/my-work', icon: 'user' },
  { name: 'Projects', path: '/projects', icon: 'folder' },
  { name: 'Resources', path: '/resources', icon: 'users' },
  { name: 'Evaluation', path: '/evaluation', icon: 'clipboard' },
  { name: 'Admin', path: '/admin', icon: 'settings' },
];

export const APP_COLORS = {
  primary: '#3B82F6', // blue-500
  secondary: '#6B7280', // gray-500
  success: '#10B981', // green-500
  danger: '#EF4444', // red-500
  warning: '#F59E0B', // amber-500
  direct: '#8B5CF6', // violet-500
};

export const EVALUATION_CRITERIA_KEYS: EvaluationCriterionKey[] = [
  'workPerformance',
  'taskCompletion',
  'collaboration',
  'problemSolving',
  'development',
  'workAttitude',
  'cultureFit',
];

export const EVALUATION_CRITERIA_LABELS: Record<EvaluationCriterionKey, string> = {
  workPerformance: '업무 성과',
  taskCompletion: '과업 완성도',
  collaboration: '협업 및 커뮤니케이션',
  problemSolving: '문제 해결 능력',
  development: '개발 역량 및 성장',
  workAttitude: '업무 태도',
  cultureFit: '조직 문화 기여',
};

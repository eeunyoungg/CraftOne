import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/mockApi';
import { Project, ProjectStatus, ProjectType, User } from '../types';
import { TEAM_MEMBERS, HOURS_PER_MM, APP_COLORS } from '../constants';
import Card from '../components/Card';
import Icon from '../components/Icon';
import SkeletonLoader from '../components/SkeletonLoader';

const ProjectList: React.FC<{ onSelectProject: (id: string) => void; onNewProject: () => void }> = ({ onSelectProject, onNewProject }) => {
    const [projects, setProjects] = useState<Project[] | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getProjects().then(data => {
            setProjects(data);
            setLoading(false);
        });
    }, []);

    const getAssignee = (id: string) => TEAM_MEMBERS.find(m => m.id === id);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-900">Projects</h1>
                <button onClick={onNewProject} className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-primary rounded-md hover:bg-blue-700">
                    <Icon name="plus" className="h-4 w-4 mr-2" />
                    프로젝트 생성
                </button>
            </div>
            <Card>
                 {loading ? <SkeletonLoader className="h-64 w-full" /> : (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {['프로젝트명', '유형', '상태', '담당자', '이번달 Actual(MM)', '누계 Actual(MM)'].map(h =>
                                <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {projects?.map(p => (
                            <tr key={p.id} onClick={() => onSelectProject(p.id)} className="hover:bg-gray-50 cursor-pointer">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                                    <span className="h-2 w-2 rounded-full mr-3" style={{ backgroundColor: p.color || '#ccc' }}></span>
                                    {p.name}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{p.type}</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.status === ProjectStatus.ACTIVE ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                        {p.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 flex -space-x-2">
                                    {p.assigneeIds.map(id => getAssignee(id)).map(assignee => assignee && (
                                        <img key={assignee.id} src={assignee.avatar} alt={assignee.name} title={assignee.name} className="h-6 w-6 rounded-full ring-2 ring-white" />
                                    ))}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">—</td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">—</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 )}
            </Card>
        </div>
    );
};

const ProjectDetail: React.FC<{ projectId: string; onBack: () => void }> = ({ projectId, onBack }) => {
    const [project, setProject] = useState<Project | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    useEffect(() => {
        setIsEditing(projectId === 'new');
        if (projectId === 'new') {
            setProject(null);
        } else if (projectId) {
            setProject(null); // Show loader while fetching, and clear old data
            api.getProject(projectId).then(setProject);
        }
    }, [projectId]);

    const handleSave = async (updatedProject: Project) => {
        if (projectId === 'new') {
            await api.createProject(updatedProject);
            // In a real app, you'd probably navigate to the new project's ID
            onBack(); 
        } else {
            const savedProject = await api.updateProject({ ...project, ...updatedProject } as Project);
            setProject(savedProject);
            setIsEditing(false);
        }
    };
    
    if (!isEditing && !project) return <SkeletonLoader className="h-screen w-full" />;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="text-gray-500 hover:text-gray-800">
                    &larr; 목록으로
                </button>
                <h1 className="text-xl font-bold text-gray-900">{isEditing ? (projectId === 'new' ? '새 프로젝트 생성' : '프로젝트 수정') : project?.name}</h1>
            </div>
            {isEditing ? (
                 <ProjectForm project={project} onSave={handleSave} onCancel={projectId === 'new' ? onBack : () => setIsEditing(false)} />
            ) : (
                project && <ProjectView project={project} onEdit={() => setIsEditing(true)} />
            )}
        </div>
    );
};

const ProjectView: React.FC<{project: Project; onEdit:() => void}> = ({project, onEdit}) => {
    // FIX: Add explicit number return type to useMemo to help with type inference.
    const totalMM = useMemo((): number => {
        if (!project.monthlyPlan) return 0;
// FIX: Explicitly providing the generic type parameter `<number>` to the `reduce` function helps TypeScript correctly infer the accumulator and return types, resolving the error where the result was incorrectly inferred as `unknown`.
        return Object.values(project.monthlyPlan).reduce<number>((total, monthPlan) => {
            // FIX: Robustly sum month values, guarding against non-numeric entries.
            const monthTotalValue = Object.values(monthPlan).reduce<number>((monthTotal, mm) => monthTotal + (Number(mm) || 0), 0);
            return total + monthTotalValue;
        }, 0);
    }, [project.monthlyPlan]);
    const assignees = useMemo(() => project.assigneeIds.map(id => TEAM_MEMBERS.find(m => m.id === id)).filter(Boolean) as User[], [project.assigneeIds]);
    const monthKeys = useMemo(() => Object.keys(project.monthlyPlan).sort(), [project.monthlyPlan]);

    return (
        <Card>
            <div className="flex justify-end">
                <button onClick={onEdit} className="flex items-center px-3 py-1 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                    <Icon name="edit" className="h-4 w-4 mr-2" /> 수정
                </button>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
                <div><strong className="text-gray-500">유형:</strong> {project.type}</div>
                <div><strong className="text-gray-500">상태:</strong> {project.status}</div>
                <div><strong className="text-gray-500">총 계획 MM:</strong> {totalMM.toFixed(1)} MM ({ (totalMM * HOURS_PER_MM).toFixed(0) }h)</div>
                <div><strong className="text-gray-500">기간:</strong> {project.startDate} ~ {project.endDate}</div>
                <div className="col-span-2"><strong className="text-gray-500">계획 출처:</strong> {project.planSource?.docTitle} ({project.planSource?.docVersion})</div>
            </div>
            <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-800">담당자</h3>
                <div className="flex space-x-4 mt-2">
                    {assignees.map(a => <div key={a.id} className="text-center text-sm"><img src={a.avatar} alt={a.name} className="h-10 w-10 rounded-full mx-auto" /><p>{a.name}</p></div>)}
                </div>
            </div>
             <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-800">월별 계획 MM</h3>
                <div className="overflow-x-auto mt-2">
                    <table className="min-w-full text-sm border">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-2 border text-left">담당자</th>
                                {monthKeys.map(month => <th key={month} className="p-2 border">{month}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                             {assignees.map(assignee => (
                                <tr key={assignee.id}>
                                    <td className="p-2 border font-medium">{assignee.name}</td>
                                    {monthKeys.map(month => (
                                        <td key={`${assignee.id}-${month}`} className="p-2 border text-center">
                                            {project.monthlyPlan[month]?.[assignee.id]?.toFixed(1) || '—'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </Card>
    );
};

const ProjectForm: React.FC<{ project: Project | null; onSave: (data: any) => void; onCancel: () => void; }> = ({ project, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Project>>({});

    useEffect(() => {
        setFormData({
            name: '',
            type: ProjectType.PROJECT,
            status: ProjectStatus.ACTIVE,
            color: APP_COLORS.primary,
            assigneeIds: [],
            startDate: '',
            endDate: '',
            monthlyPlan: {},
            ...project
        });
    }, [project]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAssigneeChange = (memberId: string) => {
        setFormData(prev => {
            const newAssigneeIds = prev.assigneeIds?.includes(memberId)
                ? prev.assigneeIds.filter(id => id !== memberId)
                : [...(prev.assigneeIds || []), memberId];
            return { ...prev, assigneeIds: newAssigneeIds };
        });
    };
    
    const monthKeys = useMemo(() => {
        if (!formData.startDate || !formData.endDate) return [];
        const start = new Date(formData.startDate);
        const end = new Date(formData.endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
        const months = [];
        let current = new Date(start.getFullYear(), start.getMonth(), 1);
        while(current <= end) {
            months.push(current.toISOString().slice(0, 7)); // YYYY-MM
            current.setMonth(current.getMonth() + 1);
        }
        return months;
    }, [formData.startDate, formData.endDate]);

    const handlePlanChange = (month: string, userId: string, value: string) => {
        const mm = parseFloat(value);
        if (isNaN(mm) && value !== '' && value !== '.') return;
        
        setFormData(prev => {
            const newMonthlyPlan = JSON.parse(JSON.stringify(prev.monthlyPlan || {}));
            if (!newMonthlyPlan[month]) newMonthlyPlan[month] = {};
            newMonthlyPlan[month][userId] = isNaN(mm) ? 0 : mm;
            return {...prev, monthlyPlan: newMonthlyPlan };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                        <span className="text-gray-700">프로젝트명</span>
                        <input type="text" name="name" value={formData.name || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                    </label>
                    <label className="block">
                        <span className="text-gray-700">유형</span>
                        <select name="type" value={formData.type} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value={ProjectType.PROJECT}>Project</option>
                            <option value={ProjectType.DIRECT}>Direct</option>
                        </select>
                    </label>
                    <label className="block">
                        <span className="text-gray-700">시작일</span>
                        <input type="date" name="startDate" value={formData.startDate || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </label>
                    <label className="block">
                        <span className="text-gray-700">종료일</span>
                        <input type="date" name="endDate" value={formData.endDate || ''} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </label>
                </div>

                <div>
                    <span className="text-gray-700">담당자 할당</span>
                    <div className="mt-2 grid grid-cols-4 gap-2">
                        {TEAM_MEMBERS.map(member => (
                            <label key={member.id} className="flex items-center space-x-2 p-2 border rounded-md">
                                <input type="checkbox" checked={formData.assigneeIds?.includes(member.id)} onChange={() => handleAssigneeChange(member.id)} />
                                <span>{member.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {formData.type === ProjectType.PROJECT && monthKeys.length > 0 && (
                <div>
                     <h3 className="text-md font-semibold text-gray-800">월별 계획 MM</h3>
                    <div className="overflow-x-auto mt-2">
                         <table className="min-w-full text-sm border">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="p-2 border text-left">담당자</th>
                                    {monthKeys.map(month => <th key={month} className="p-2 border">{month}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {formData.assigneeIds?.map(id => TEAM_MEMBERS.find(m => m.id === id)).map(assignee => assignee && (
                                    <tr key={assignee.id}>
                                        <td className="p-2 border font-medium">{assignee.name}</td>
                                        {monthKeys.map(month => (
                                            <td key={`${assignee.id}-${month}`} className="p-1 border text-center">
                                                <input type="number" step="0.1"
                                                    value={formData.monthlyPlan?.[month]?.[assignee.id] || ''}
                                                    onChange={e => handlePlanChange(month, assignee.id, e.target.value)}
                                                    className="w-20 text-center rounded-md border-gray-300 shadow-sm"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}


                <div className="flex justify-end gap-4">
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">취소</button>
                    <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-md hover:bg-blue-700">저장</button>
                </div>
            </form>
        </Card>
    );
};


const ProjectsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  
  const handleSelectProject = (id: string) => {
    setSearchParams({ projectId: id });
  };
  
  const handleBackToList = () => {
    setSearchParams({});
  };

  const handleNewProject = () => {
      setSearchParams({ projectId: 'new' });
  }

  return (
    <>
      {projectId 
        ? <ProjectDetail projectId={projectId} onBack={handleBackToList} />
        : <ProjectList onSelectProject={handleSelectProject} onNewProject={handleNewProject}/>
      }
    </>
  );
};

export default ProjectsPage;
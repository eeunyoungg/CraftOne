
import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Tabs from '../components/Tabs';
import Card from '../components/Card';

const TABS = [
  { key: 'integrations', label: '연동' },
  { key: 'permissions', label: '권한' },
  { key: 'cache', label: '캐시/집계' },
];

const IntegrationsTab: React.FC = () => <Card title="연동 설정"><p>Redmine, Calendar 등 외부 서비스 연동 설정.</p></Card>;
const PermissionsTab: React.FC = () => <Card title="권한 관리"><p>역할별 메뉴 접근/데이터 범위 설정 매트릭스.</p></Card>;
const CacheTab: React.FC = () => <Card title="캐시/집계"><p>관리용 캐시 재생성 및 상태 보기 기능.</p></Card>;


const AdminPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'integrations';

  const renderTabContent = () => {
    switch(activeTab) {
      case 'integrations': return <IntegrationsTab />;
      case 'permissions': return <PermissionsTab />;
      case 'cache': return <CacheTab />;
      default: return <IntegrationsTab />;
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Admin</h1>
      <Tabs tabs={TABS} defaultTab="integrations" />
      <div className="pt-4">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminPage;

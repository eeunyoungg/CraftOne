
import React from 'react';
import { useSearchParams } from 'react-router-dom';

interface TabsProps {
  tabs: { key: string; label: string }[];
  defaultTab: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, defaultTab }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || defaultTab;

  const handleTabClick = (tabKey: string) => {
    setSearchParams({ tab: tabKey });
  };

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabClick(tab.key)}
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;

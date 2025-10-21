
import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS, CURRENT_USER } from '../constants';
import Icon from '../components/Icon';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-60 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-4 border-b border-gray-200">
           <Icon name="logo" className="h-8 w-8 text-primary" />
           <span className="ml-2 text-xl font-bold text-gray-800">craftone</span>
        </div>
        <nav className="flex-1 py-4">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-2.5 text-sm font-medium mx-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-primary'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                >
                  <Icon name={item.icon} className="h-5 w-5 mr-3" />
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center">
            <img src={CURRENT_USER.avatar} alt={CURRENT_USER.name} className="h-9 w-9 rounded-full" />
            <div className="ml-3">
              <p className="text-sm font-semibold text-gray-800">{CURRENT_USER.name}</p>
              <p className="text-xs text-gray-500">{CURRENT_USER.role}</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex-shrink-0">
          {/* Header content can go here, e.g., breadcrumbs, search bar */}
        </header>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;

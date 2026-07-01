import type { TabId } from '../App';

interface TabBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  deviceMode: 'mobile' | 'tablet';
}

interface TabItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

export default function TabBar({ active, onChange, deviceMode }: TabBarProps) {
  const tabs: TabItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      id: 'accounts',
      label: 'Accounts',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
        </svg>
      ),
    },
    {
      id: 'invest',
      label: 'Invest',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
        </svg>
      ),
    },
    {
      id: 'goals',
      label: 'Goals',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-6.75a1.125 1.125 0 0 0-1.125 1.125v3.375m9 0h-9M9 10.5h.008v.008H9V10.5Zm6 0h.008v.008H15V10.5Zm-6 3h.008v.008H9v-.008Zm6 0h.008v.008H15v-.008Zm-3-6h.008v.008H12V7.5Zm0 3h.008v.008H12v-.008Zm0 3h.008v.008H12v-.008Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex justify-around items-center h-14 bg-ink-raised/80 border border-ink-border/80 px-4 py-2 relative z-25 backdrop-blur-lg flex-none rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.55)] mx-4 mb-4 mt-2 lg:mx-8 lg:mb-5 lg:mt-3">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            title={tab.label}
            className={`flex items-center gap-2 justify-center py-2 px-3.5 rounded-full transition-all duration-300 cursor-pointer focus:outline-none ${
              isActive
                ? 'bg-gold text-ink font-bold shadow-[0_3px_10px_rgba(212,175,106,0.25)]'
                : 'text-paper-dim hover:text-paper hover:bg-ink-border/30'
            }`}
          >
            <span className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
              {tab.icon}
            </span>
            {deviceMode === 'tablet' && (
              <span className="text-xs font-semibold leading-none">{tab.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

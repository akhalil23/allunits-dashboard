import type { ReactNode } from 'react';
import Sidebar from './Sidebar';

interface Props {
  children: ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  return (
    <div className="flex h-screen bg-background" style={{ overflow: 'clip' }}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 min-h-0">
        {children}
      </div>
    </div>
  );
}

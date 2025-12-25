import { Outlet } from 'react-router-dom';
import { AppNav } from './AppNav';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

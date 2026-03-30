import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../header';
import { Sidebar } from '../sidebar';
import styles from './MainLayout.module.css';

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className={styles.layout}>
      <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

import React, { FC, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarProvider } from '../../context/SidebarContext';

const MainLayout: FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const location = useLocation();
  const toggleSidebar = (): void => setIsCollapsed(!isCollapsed);

  return (
    <div className="min-h-screen flex">
      <Sidebar isCollapsed={isCollapsed} />
      <div className={`flex flex-col flex-1 transition-all duration-150 ${isCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
        <Topbar toggleSidebar={toggleSidebar} isCollapsed={isCollapsed} />
        <main className="flex-1 pt-16 p-4 sm:p-6 lg:p-8 bg-gray-100">
          <AnimatePresence>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              <SidebarProvider isCollapsed={isCollapsed}>
                <Outlet />
              </SidebarProvider>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

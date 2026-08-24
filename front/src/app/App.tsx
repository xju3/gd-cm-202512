import { useState, useEffect } from 'react';
import AdminApp from './AdminApp';
import MobileApp from './MobileApp';
import DesktopApp from './DesktopApp';

/**
 * 判断当前是否处于后台管理路由。
 * @returns 是否展示后台管理页面
 */
function isAdminRoute(): boolean {
  return window.location.hash.startsWith('#/admin');
}

export default function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(isAdminRoute());

  useEffect(() => {
    /**
     * 根据窗口宽度同步当前终端形态。
     */
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    /**
     * 监听 hash 路由变化，切换工单页与后台页。
     */
    const handleHashChange = () => {
      setShowAdmin(isAdminRoute());
    };

    checkMobile();
    handleHashChange();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  if (showAdmin) {
    return <AdminApp />;
  }

  if (isMobile) {
    return <MobileApp />;
  }

  return <DesktopApp />;
}

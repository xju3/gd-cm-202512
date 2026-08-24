import { useState, useEffect } from 'react';
import MobileApp from './MobileApp';
import DesktopApp from './DesktopApp';

export default function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return <MobileApp />;
  }

  return <DesktopApp />;
}
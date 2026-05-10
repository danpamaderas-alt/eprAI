import { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from "./mobileNav.config";
const NAV_BASE_CLASS = "flex flex-col items-center gap-1 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1";
const ACTIVE_CLASS = "text-blue-600 dark:text-blue-400 scale-110";
const INACTIVE_CLASS = "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300";
 
export const MobileNav = memo(() => {
  return (
    <nav 
      aria-label="Navegación principal móvil"
      className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] pb-safe"
    >
      {NAV_ITEMS.map(({ path, label, Icon }) => (
        <NavLink 
          key={path} 
          to={path} 
          className={({ isActive }) => 
            `${NAV_BASE_CLASS} ${isActive ? ACTIVE_CLASS : INACTIVE_CLASS}`
          }
          aria-label={`Navegar a ${label}`}
        >
          {({ isActive }) => (
            <>
              <Icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 2} 
                aria-hidden="true" 
              />
              <span className="text-[10px] font-bold uppercase tracking-wide">
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
});

MobileNav.displayName = 'MobileNav';
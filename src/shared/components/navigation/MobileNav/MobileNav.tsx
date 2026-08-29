import { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from "./mobileNav.config";

export const MobileNav = memo(() => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t dark:border-slate-800 px-6 py-3 z-50 md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      <div className="flex justify-between items-center max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          if (!Icon) return null;

          return (
            <NavLink
              key={item.href} // ✅ FIX: Key única para eliminar el warning de la consola
              to={item.href}
              className={({ isActive }) => 
                `flex flex-col items-center gap-1 transition-colors ${
                  isActive ? 'text-blue-600 scale-110' : 'text-slate-400'
                }`
              }
            >
              {/* ✅ FIX: Ahora pasamos isActive correctamente al icono */}
              {({ isActive }) => (
                <>
                  <Icon size={20} strokeWidth={isActive ? 3 : 2} />
                  <span className="text-[10px] font-black uppercase tracking-tighter">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
});

MobileNav.displayName = 'MobileNav';
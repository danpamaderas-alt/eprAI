import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useNotifications, type Notification } from './useNotifications';

const TYPE_STYLES: Record<Notification['type'], { icon: typeof Bell; color: string }> = {
  info: { icon: Info, color: 'text-blue-400 bg-blue-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10' },
  success: { icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/10' },
};

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const NotificationItem = memo(({ notification }: { notification: Notification }) => {
  const markAsRead = useNotifications((s) => s.markAsRead);
  const { icon: Icon, color } = TYPE_STYLES[notification.type];

  return (
    <button
      onClick={() => markAsRead(notification.id)}
      className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors ${
        notification.read
          ? 'opacity-60 hover:bg-slate-100 dark:hover:bg-slate-700/50'
          : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80'
      }`}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{notification.title}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{notification.message}</p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[9px] font-bold text-slate-400">{formatTime(notification.timestamp)}</span>
        {!notification.read && (
          <span className="w-2 h-2 rounded-full bg-brand-500" />
        )}
      </div>
    </button>
  );
});

NotificationItem.displayName = 'NotificationItem';

export const NotificationBell = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const notifications = useNotifications((s) => s.notifications);
  const unreadCount = useNotifications((s) => s.unreadCount());
  const markAllAsRead = useNotifications((s) => s.markAllAsRead);
  const clearAll = useNotifications((s) => s.clearAll);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={toggle}
        aria-label="Notificaciones"
        className="relative w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-colors text-slate-400 hover:text-white focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-danger-600 text-white text-[8px] font-black flex items-center justify-center" aria-label={`${unreadCount} notificaciones sin leer`} role="status">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
              Notificaciones
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Marcar todas como leídas"
                >
                  <CheckCheck className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-danger-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Limpiar todo"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Bell className="w-6 h-6 mb-2 opacity-40" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
});

NotificationBell.displayName = 'NotificationBell';

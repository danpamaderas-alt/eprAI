import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type NotificationType = 'info' | 'warning' | 'success';

export interface Notification {
  readonly id: string;
  readonly title: string;
  readonly message: string;
  readonly type: NotificationType;
  readonly read: boolean;
  readonly timestamp: number;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: () => number;
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
}

const MAX_NOTIFICATIONS = 50;

export const useNotifications = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: [],

      unreadCount: () => get().notifications.filter((n) => !n.read).length,

      addNotification: (n) => {
        const notification: Notification = {
          ...n,
          id: crypto.randomUUID(),
          read: false,
          timestamp: Date.now(),
        };
        set((state) => {
          const updated = [notification, ...state.notifications].slice(0, MAX_NOTIFICATIONS);
          return { notifications: updated };
        });
      },

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      clearAll: () => set({ notifications: [] }),
    }),
    {
      name: 'epr_notifications',
    },
  ),
);

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import './css/Notification.css';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((message, type = 'info', duration = 3200) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setNotifications((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      window.setTimeout(() => dismiss(id), duration);
    }

    return id;
  }, [dismiss]);

  const value = useMemo(() => ({ notify, dismiss }), [notify, dismiss]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <div className="app-notification-root" role="status" aria-live="polite">
        {notifications.map((item) => (
          <div key={item.id} className={`app-notification app-notification--${item.type}`}>
            <span className="app-notification__message">{item.message}</span>
            <button
              type="button"
              className="app-notification__close"
              onClick={() => dismiss(item.id)}
              aria-label="알림 닫기"
            >
              X
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}

const API_BASE_URL = 'http://localhost:3001';

export interface NotificationWithSender {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    email: string;
    pfpUrl: string | null;
  };
  comment: {
    id: string;
    content: string;
  };
}

export interface UnreadCountResponse {
  count?: number;
}

export const notificationService = {
  async getNotifications(): Promise<NotificationWithSender[]> {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`${API_BASE_URL}/notifications`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch notifications');
    }

    return response.json();
  },

  async getUnreadCount(): Promise<number> {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch unread count');
    }

    // The backend returns just a number, not an object
    const count = await response.json();
    return typeof count === 'number' ? count : 0;
  },

  async markAsRead(notificationId: string): Promise<void> {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }
  },

  async markAllAsRead(): Promise<void> {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('No authentication token');

    const response = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to mark all notifications as read');
    }
  },
}; 
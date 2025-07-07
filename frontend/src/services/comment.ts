// Comment service for interacting with backend comment APIs
const API_BASE_URL = 'http://localhost:3001';

export interface BasicComment {
  id: string;
  content: string;
  author: { id: string; email: string; pfpUrl: string | null };
  createdAt: string;
  updatedAt: string | null;
  deletedAt: string | null;
}

export interface CommentNode {
  comment: BasicComment;
  replies: CommentNode[];
}

export interface ThreadsResponse {
  comments: CommentNode[];
  info: {
    count: number;
    count_left: number;
    last_comment: string | null;
  };
}

interface CreateCommentPayload {
  content: string;
  parentId?: string;
}

interface EditCommentPayload {
  content: string;
}

interface FindThreadsParams {
  limit?: number;
  offset_id?: string;
}

function getAuthHeaders(token?: string): Record<string, string> {
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

export const commentService = {
  async getThreads(params: FindThreadsParams = {}): Promise<ThreadsResponse> {
    const { limit = 10, offset_id } = params;
    const searchParams = new URLSearchParams({ limit: limit.toString() });
    if (offset_id) {
      searchParams.append('offset_id', offset_id);
    }
    
    const res = await fetch(`${API_BASE_URL}/comment?${searchParams}`);
    if (!res.ok) {
      throw new Error('Failed to load comments');
    }
    return res.json();
  },

  async createComment(payload: CreateCommentPayload, token: string): Promise<BasicComment> {
    const res = await fetch(`${API_BASE_URL}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(token),
      } as HeadersInit,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to create comment');
    }
    return res.json();
  },

  async editComment(commentId: string, payload: EditCommentPayload, token: string): Promise<BasicComment> {
    const res = await fetch(`${API_BASE_URL}/comment/${commentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(token),
      } as HeadersInit,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to edit comment');
    }
    return res.json();
  },

  async deleteComment(commentId: string, token: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/comment/${commentId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(token),
      } as HeadersInit,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete comment');
    }
  },

  async restoreComment(commentId: string, token: string): Promise<BasicComment> {
    const res = await fetch(`${API_BASE_URL}/comment/${commentId}/restore`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(token),
      } as HeadersInit,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to restore comment');
    }
    return res.json();
  },

  async seedComments(): Promise<{ message: string; counts: { users: number; comments: number; threads: number } }> {
    const res = await fetch(`${API_BASE_URL}/comment/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      } as HeadersInit,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to seed comments');
    }
    return res.json();
  },
};
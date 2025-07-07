const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface LoginData {
  email: string;
  password: string;
}

interface SignupData {
  email: string;
  password: string;
}

interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    pfpUrl?: string | null;
  };
}

interface BackendAuthResponse {
  accessToken: string;
}

export const authService = {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = 'Login failed';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        // If response is not JSON, use default message
      }
      throw new Error(errorMessage);
    }

    const result: BackendAuthResponse = await response.json();
    
    // Transform to match AuthResponse format
    return {
      access_token: result.accessToken,
      user: this.getUserFromToken(result.accessToken),
    };
  },

  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      let errorMessage = 'Signup failed';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch {
        // If response is not JSON, use default message
      }
      throw new Error(errorMessage);
    }

    const result: BackendAuthResponse = await response.json();
    
    // Transform to match AuthResponse format
    return {
      access_token: result.accessToken,
      user: this.getUserFromToken(result.accessToken),
    };
  },

  getUserFromToken(token: string): { id: string; email: string; pfpUrl?: string | null } {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        id: payload.sub,
        email: payload.email,
        pfpUrl: payload.pfpUrl,
      };
    } catch {
      return { id: '', email: '', pfpUrl: null };
    }
  },

  getUserIdFromToken(token: string): string {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub;
    } catch {
      return '';
    }
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  setToken(token: string): void {
    localStorage.setItem('auth_token', token);
  },

  removeToken(): void {
    localStorage.removeItem('auth_token');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },
};
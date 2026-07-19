import axios from 'axios';
import type {
  ApiResponse,
  User,
  LoginCredentials,
  RegisterData,
} from '@/types';

class AuthService {
  private baseURL = '/api/auth';

  /**
   * Login with credentials
   */
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await axios.post(`${this.baseURL}/login`, credentials);
    return response.data;
  }

  /**
   * Register a new tenant and user
   */
  async register(data: RegisterData): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await axios.post(`${this.baseURL}/register`, data);
    return response.data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/logout`);
      return response.data;
    } catch (error) {
      // Even if logout fails on server, we should clear local state
      return { success: true, message: 'Logged out locally' };
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    const response = await axios.get(`${this.baseURL}/me`);
    return response.data;
  }

  async updateProfile(data: { username?: string; email?: string; fullName?: string }): Promise<ApiResponse<{ user: User }>> {
    const response = await axios.patch(`${this.baseURL}/profile`, data);
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    const response = await axios.post(`${this.baseURL}/change-password`, { currentPassword, newPassword });
    return response.data;
  }

  async updatePreferences(preferences: Record<string, unknown>): Promise<ApiResponse<{ settings: string }>> {
    const response = await axios.patch(`${this.baseURL}/preferences`, preferences);
    return response.data;
  }

  /**
   * Check if subdomain is available
   */
  async checkSubdomainAvailability(subdomain: string): Promise<ApiResponse<{ subdomain: string; available: boolean }>> {
    const response = await axios.get(`${this.baseURL}/check-subdomain/${subdomain}`);
    return response.data;
  }

  /**
   * Set authorization header for all requests
   */
  setAuthToken(token: string) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Remove authorization header
   */
  removeAuthToken() {
    delete axios.defaults.headers.common['Authorization'];
  }

  /**
   * Validate token format
   */
  isValidToken(token: string): boolean {
    if (!token || typeof token !== 'string') return false;

    // Basic JWT format check (should have 3 parts separated by dots)
    const parts = token.split('.');
    return parts.length === 3;
  }

  /**
   * Check if token is expired (basic check)
   */
  isTokenExpired(token: string): boolean {
    try {
      if (!this.isValidToken(token)) return true;

      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      return payload.exp < currentTime;
    } catch (error) {
      return true; // If we can't parse it, assume it's expired
    }
  }
}

export const authService = new AuthService();
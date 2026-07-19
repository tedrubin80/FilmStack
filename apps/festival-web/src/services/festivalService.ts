import axios from 'axios';
import type { ApiResponse, Festival, PaginationInfo } from '@/types';

export interface CreateFestivalData {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  submissionDeadline?: string;
  entryFee?: number;
  currency?: string;
}

export interface FestivalsResponse {
  festivals: Festival[];
  pagination: PaginationInfo;
}

export interface FestivalWithCounts extends Festival {
  _count: {
    films: number;
    awards: number;
  };
}

class FestivalService {
  private baseURL = '/api/festivals';

  /**
   * Get all festivals with pagination
   */
  async getFestivals(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive' | 'all';
  }): Promise<ApiResponse<{ festivals: FestivalWithCounts[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);

    const response = await axios.get(`${this.baseURL}?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get a single festival by ID
   */
  async getFestival(id: number): Promise<ApiResponse<{ festival: FestivalWithCounts }>> {
    const response = await axios.get(`${this.baseURL}/${id}`);
    return response.data;
  }

  /**
   * Create a new festival
   */
  async createFestival(data: CreateFestivalData): Promise<ApiResponse<{ festival: Festival }>> {
    const response = await axios.post(this.baseURL, data);
    return response.data;
  }

  /**
   * Update a festival
   */
  async updateFestival(id: number, data: Partial<CreateFestivalData>): Promise<ApiResponse<{ festival: Festival }>> {
    const response = await axios.put(`${this.baseURL}/${id}`, data);
    return response.data;
  }

  /**
   * Delete a festival
   */
  async deleteFestival(id: number): Promise<ApiResponse> {
    const response = await axios.delete(`${this.baseURL}/${id}`);
    return response.data;
  }

  /**
   * Get festival statistics
   */
  async getFestivalStats(id: number): Promise<ApiResponse<{ festivalId: number; statistics: any }>> {
    const response = await axios.get(`${this.baseURL}/${id}/stats`);
    return response.data;
  }
}

export const festivalService = new FestivalService();

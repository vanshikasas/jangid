import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface ApiEnvelope<T> {
  data: T;
}

export interface PortalUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  isActive: boolean;
}

export interface PortalSession {
  user: PortalUser;
  csrfToken: string;
}

export interface PortalOverview {
  projects: number;
  employees?: number;
  inquiries?: number;
  tasks?: number;
  team?: number;
  messages?: number;
}

export interface PortalProject {
  id: string;
  title: string;
  category: string;
  place: string;
  image: string;
  status: string;
  clientStatus: string;
}

export interface PortalMessage {
  id: string;
  senderName: string;
  content: string;
  projectId?: string;
  isGlobal: boolean;
  createdAt: string;
}

export interface PortalInquiry {
  id: string;
  kind: string;
  name: string;
  email: string;
  subject: string;
  createdAt: string;
}

export interface PortalTask {
  id: string;
  title: string;
  description: string;
  status: string;
  progress: number;
  updatedAt: string;
}

export interface PortalMediaFile {
  id: string;
  filename: string;
  contentType: string;
  publicUrl: string;
  scope?: 'projects' | 'services';
}

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = window.SKJA_CONFIG?.apiBaseUrl ?? 'http://localhost:5000/api/v1';
  private csrfToken = '';

  async login(email: string, password: string): Promise<PortalSession> {
    const session = await this.request<PortalSession>('POST', '/auth/login', { email, password });
    this.csrfToken = session.csrfToken;
    return session;
  }

  async currentSession(): Promise<PortalSession> {
    const session = await this.request<PortalSession>('GET', '/auth/me');
    this.csrfToken = session.csrfToken;
    return session;
  }

  async logout(): Promise<void> {
    const headers = this.csrfToken ? new HttpHeaders({ 'X-CSRF-Token': this.csrfToken }) : undefined;
    await firstValueFrom(this.http.post(`${this.apiBaseUrl}/auth/logout`, {}, {
      headers,
      responseType: 'text',
      withCredentials: true,
    }));
    this.csrfToken = '';
  }

  async googleLogin(): Promise<{ enabled: boolean; message: string; redirectUrl?: string | null }> {
    return this.request<{ enabled: boolean; message: string; redirectUrl?: string | null }>('GET', '/auth/google');
  }

  overview(employer: boolean): Promise<PortalOverview> {
    return this.request<PortalOverview>('GET', employer ? '/admin/overview' : '/client/overview');
  }

  projects(employer: boolean): Promise<PortalProject[]> {
    return this.request<PortalProject[]>('GET', employer ? '/admin/projects' : '/client/projects');
  }

  messages(): Promise<PortalMessage[]> {
    return this.request<PortalMessage[]>('GET', '/chat/messages');
  }

  sendMessage(content: string, projectId?: string): Promise<PortalMessage> {
    return this.request<PortalMessage>('POST', '/chat/messages', { content, projectId });
  }

  inquiries(): Promise<PortalInquiry[]> {
    return this.request<PortalInquiry[]>('GET', '/admin/inquiries');
  }

  tasks(): Promise<PortalTask[]> {
    return this.request<PortalTask[]>('GET', '/admin/tasks');
  }

  projectMedia(): Promise<PortalMediaFile[]> {
    return this.request<PortalMediaFile[]>('GET', '/admin/media/projects');
  }

  serviceMedia(): Promise<PortalMediaFile[]> {
    return this.request<PortalMediaFile[]>('GET', '/admin/media/services');
  }

  async uploadMedia(scope: 'projects' | 'services', file: File): Promise<PortalMediaFile> {
    const headers = this.csrfToken ? new HttpHeaders({ 'X-CSRF-Token': this.csrfToken }) : undefined;
    const formData = new FormData();
    formData.append('file', file);
    const response = await firstValueFrom(this.http.post<ApiEnvelope<PortalMediaFile>>(`${this.apiBaseUrl}/admin/media/${scope}/upload`, formData, {
      headers,
      withCredentials: true,
    }));
    return response.data;
  }

  async deleteMedia(scope: 'projects' | 'services', id: string): Promise<void> {
    const headers = this.csrfToken ? new HttpHeaders({ 'X-CSRF-Token': this.csrfToken }) : undefined;
    await firstValueFrom(this.http.delete(`${this.apiBaseUrl}/admin/media/${scope}/${id}`, {
      headers,
      responseType: 'text',
      withCredentials: true,
    }));
  }

  private request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers = this.csrfToken ? new HttpHeaders({ 'X-CSRF-Token': this.csrfToken }) : undefined;
    return firstValueFrom(this.http.request<ApiEnvelope<T>>(method, `${this.apiBaseUrl}${path}`, {
      body,
      headers,
      withCredentials: true,
    })).then((response) => response.data);
  }
}

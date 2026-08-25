import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ClientInquiry, EmploymentInquiry, Project, Service } from '../models/site.models';

interface ApiEnvelope<T> {
  data: T;
}

interface RuntimeConfig {
  apiBaseUrl?: string;
}

declare global {
  interface Window {
    SKJA_CONFIG?: RuntimeConfig;
  }
}

@Injectable({ providedIn: 'root' })
export class PublicApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = window.SKJA_CONFIG?.apiBaseUrl ?? 'http://localhost:5000/api/v1';

  getPublicContent(): Promise<{ projects: Project[]; services: Service[] }> {
    return Promise.all([this.get<Project[]>('/public/projects'), this.get<Service[]>('/public/services')])
      .then(([projects, services]) => ({ projects, services }));
  }

  submitClientInquiry(inquiry: ClientInquiry): Promise<{ id: string }> {
    return this.post<{ id: string }>('/inquiries/client', inquiry);
  }

  submitEmploymentInquiry(inquiry: EmploymentInquiry): Promise<{ id: string }> {
    return this.post<{ id: string }>('/inquiries/employment', inquiry);
  }

  private get<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<ApiEnvelope<T>>(`${this.apiBaseUrl}${path}`, { withCredentials: true }))
      .then((response) => response.data);
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<ApiEnvelope<T>>(`${this.apiBaseUrl}${path}`, body, { withCredentials: true }))
      .then((response) => response.data);
  }
}

import { Injectable, computed, signal } from '@angular/core';
import { Project, Service } from '../models/site.models';
import { PublicApiService } from './public-api.service';

interface ContentState {
  projects: Project[];
  services: Service[];
  loading: boolean;
  unavailable: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly state = signal<ContentState>({ projects: [], services: [], loading: true, unavailable: false });
  private hasLoaded = false;

  readonly projects = computed(() => this.state().projects);
  readonly services = computed(() => this.state().services);
  readonly loading = computed(() => this.state().loading);
  readonly unavailable = computed(() => this.state().unavailable);

  constructor(private readonly api: PublicApiService) {}

  async load(): Promise<void> {
    if (this.hasLoaded) return;
    this.hasLoaded = true;

    try {
      const content = await this.api.getPublicContent();
      this.state.set({ ...content, loading: false, unavailable: false });
    } catch {
      this.state.set({ projects: [], services: [], loading: false, unavailable: true });
    }
  }
}

import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardApiService, PortalInquiry, PortalMediaFile, PortalMessage, PortalOverview, PortalProject, PortalSession, PortalTask, PortalUser } from '../core/services/dashboard-api.service';

type DashboardView = 'overview' | 'projects' | 'messages' | 'inquiries' | 'workspace';

const employerRoles = new Set(['ADMIN', 'PRINCIPAL', 'PROJECT_MANAGER', 'ARCHITECT', 'DESIGNER', 'FINANCE', 'HR']);
const projectRoles = new Set(['ADMIN', 'PRINCIPAL', 'PROJECT_MANAGER']);

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  template: `
    <section class="portal-shell">
      @if (!session) {
        <div class="portal-login">
          <div class="portal-login__brand">
            <img src="/brand/skja-logo.png" alt="SK Jangid & Associates" />
            <p>Private project spaces for clients and studio teams.</p>
          </div>
          <form class="portal-login__form" (ngSubmit)="signIn()">
            <span class="portal-kicker">Secure access</span>
            <h1>{{ loginMode === 'client' ? 'Client Portal' : 'Employer Portal' }}</h1>
            <div class="portal-switch" role="group" aria-label="Portal type">
              <button type="button" [class.is-active]="loginMode === 'client'" (click)="loginMode = 'client'">Client</button>
              <button type="button" [class.is-active]="loginMode === 'employer'" (click)="loginMode = 'employer'">Employer</button>
            </div>
            @if (loginMode === 'client') {
              <button type="button" class="portal-google" (click)="continueWithGoogle()" [disabled]="busy">
                <span class="portal-google__icon" aria-hidden="true">G</span>
                Continue with Google
              </button>
            }
            <label>Email<input name="email" [(ngModel)]="email" type="email" autocomplete="username" required /></label>
            <label>Password<input name="password" [(ngModel)]="password" type="password" autocomplete="current-password" minlength="12" required /></label>
            <button class="portal-primary" type="submit" [disabled]="busy">{{ busy ? 'Signing in...' : 'Sign in' }}</button>
            <p class="portal-status" role="status">{{ status }}</p>
            <a routerLink="/contact">New here? Start a project enquiry.</a>
          </form>
        </div>
      } @else {
        <div class="portal-workspace">
          <aside class="portal-sidebar">
            <a routerLink="/" class="portal-sidebar__brand"><img src="/brand/skja-logo.png" alt="SK Jangid & Associates" /></a>
            <nav aria-label="Portal navigation">
              <button [class.is-active]="activeView === 'overview'" (click)="selectView('overview')">Overview</button>
              <button [class.is-active]="activeView === 'projects'" (click)="selectView('projects')">Projects</button>
              <button [class.is-active]="activeView === 'messages'" (click)="selectView('messages')">Messages</button>
              @if (isAdmin) { <button [class.is-active]="activeView === 'inquiries'" (click)="selectView('inquiries')">Enquiries</button> }
              @if (canManageProjects) { <button [class.is-active]="activeView === 'workspace'" (click)="selectView('workspace')">Workspace</button> }
            </nav>
            <div class="portal-sidebar__user"><strong>{{ session.user.name }}</strong><span>{{ session.user.roles.join(' / ') }}</span><button type="button" (click)="signOut()">Sign out</button></div>
          </aside>
          <main class="portal-main">
            <header class="portal-main__header"><div><span class="portal-kicker">SKJA workspace</span><h1>{{ viewTitle }}</h1></div><button class="portal-refresh" type="button" (click)="refreshActiveView()" [disabled]="busy">Refresh</button></header>
            <p class="portal-status" role="status">{{ status }}</p>

            @if (activeView === 'overview') {
              <section class="portal-metrics">
                @for (metric of metrics; track metric.label) { <article><span>{{ metric.label }}</span><strong>{{ metric.value.toString().padStart(2, '0') }}</strong></article> }
              </section>
              <section class="portal-note"><span class="portal-kicker">Your connected space</span><h2>Project communication, progress, and studio access in one protected workspace.</h2><p>Access is shown according to the roles assigned by the studio administrator.</p></section>
            }

            @if (activeView === 'projects') {
              <section class="portal-list">
                @for (project of projects; track project.id) { <article><div><span>{{ project.category }}</span><h2>{{ project.title }}</h2><p>{{ project.place }}</p></div><div class="portal-tag-group"><span>{{ project.status }}</span>@if (project.clientStatus !== 'None') { <span>{{ project.clientStatus }}</span> }</div></article> } @empty { <p>No projects are available for this account.</p> }
              </section>
            }

            @if (activeView === 'messages') {
              <section class="portal-messages">
                <form class="portal-compose" (ngSubmit)="sendMessage()"><label>Message<textarea name="message" [(ngModel)]="messageDraft" rows="3" maxlength="1000" required></textarea></label><button class="portal-primary" type="submit" [disabled]="busy">Send message</button></form>
                <div class="portal-list">@for (message of messages; track message.id) { <article><div><span>{{ message.senderName }} / {{ message.isGlobal ? 'Studio team' : 'Private message' }}</span><p>{{ message.content }}</p></div><time>{{ message.createdAt | date: 'medium' }}</time></article> } @empty { <p>No messages yet. Start a conversation with the studio.</p> }</div>
              </section>
            }

            @if (activeView === 'inquiries' && isAdmin) {
              <section class="portal-list">@for (inquiry of inquiries; track inquiry.id) { <article><div><span>{{ inquiry.kind }} / {{ inquiry.createdAt | date: 'mediumDate' }}</span><h2>{{ inquiry.subject }}</h2><p>{{ inquiry.name }} / {{ inquiry.email }}</p></div></article> } @empty { <p>No new enquiries.</p> }</section>
            }

            @if (activeView === 'workspace' && canManageProjects) {
              <section class="portal-list">@for (task of tasks; track task.id) { <article><div><span>{{ task.status }} / {{ task.progress }}% complete</span><h2>{{ task.title }}</h2><p>{{ task.description }}</p></div><time>{{ task.updatedAt | date: 'mediumDate' }}</time></article> } @empty { <p>No tasks have been created yet.</p> }</section>
              <section class="portal-media">
                <header class="portal-media__head">
                  <h2>Page images</h2>
                  <div class="portal-switch" role="group" aria-label="Media scope">
                    <button type="button" [class.is-active]="mediaScope === 'projects'" (click)="mediaScope = 'projects'">Projects page</button>
                    <button type="button" [class.is-active]="mediaScope === 'services'" (click)="mediaScope = 'services'">Services page</button>
                  </div>
                </header>
                <form class="portal-compose" (ngSubmit)="uploadSelectedMedia()">
                  <label>Upload image<input type="file" accept="image/*" (change)="onMediaSelected($event)" /></label>
                  <button class="portal-primary" type="submit" [disabled]="busy || !selectedMediaFile">Upload</button>
                </form>
                <div class="portal-media__grid">
                  @for (file of activeMediaFiles; track file.id) {
                    <article>
                      <img [src]="file.publicUrl" [alt]="file.filename" loading="lazy" decoding="async" />
                      <div>
                        <p>{{ file.filename }}</p>
                        <button type="button" (click)="removeMedia(file.id)" [disabled]="busy">Remove</button>
                      </div>
                    </article>
                  } @empty {
                    <p>No images uploaded for this page yet.</p>
                  }
                </div>
              </section>
            }
          </main>
        </div>
      }
    </section>
  `,
})
export class DashboardPageComponent implements OnInit {
  private readonly api = inject(DashboardApiService);
  session: PortalSession | null = null;
  loginMode: 'client' | 'employer' = 'client';
  activeView: DashboardView = 'overview';
  email = '';
  password = '';
  messageDraft = '';
  busy = false;
  status = '';
  overview: PortalOverview | null = null;
  projects: PortalProject[] = [];
  messages: PortalMessage[] = [];
  inquiries: PortalInquiry[] = [];
  tasks: PortalTask[] = [];
  projectMedia: PortalMediaFile[] = [];
  serviceMedia: PortalMediaFile[] = [];
  mediaScope: 'projects' | 'services' = 'projects';
  selectedMediaFile: File | null = null;

  ngOnInit(): void {
    void this.restoreSession();
  }

  get user(): PortalUser | null {
    return this.session?.user ?? null;
  }

  get isEmployer(): boolean {
    return this.user?.roles.some((role) => employerRoles.has(role)) ?? false;
  }

  get isAdmin(): boolean {
    return this.user?.roles.includes('ADMIN') ?? false;
  }

  get canManageProjects(): boolean {
    return this.user?.roles.some((role) => projectRoles.has(role)) ?? false;
  }

  get viewTitle(): string {
    return ({ overview: 'Overview', projects: 'Projects', messages: 'Messages', inquiries: 'Enquiries', workspace: 'Workspace' })[this.activeView];
  }

  get metrics(): Array<{ label: string; value: number }> {
    if (!this.overview) return [];
    return this.isEmployer
      ? [{ label: 'Projects', value: this.overview.projects }, { label: 'Team members', value: this.overview.employees ?? 0 }, { label: 'New enquiries', value: this.overview.inquiries ?? 0 }, { label: 'Open tasks', value: this.overview.tasks ?? 0 }]
      : [{ label: 'Projects', value: this.overview.projects }, { label: 'Studio team', value: this.overview.team ?? 0 }, { label: 'Messages', value: this.overview.messages ?? 0 }];
  }

  async signIn(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.status = '';
    try {
      const session = await this.api.login(this.email.trim(), this.password);
      const signingInAsEmployer = session.user.roles.some((role) => employerRoles.has(role));
      if ((this.loginMode === 'employer') !== signingInAsEmployer) {
        await this.api.logout();
        throw new Error(this.loginMode === 'employer' ? 'This account is not an employer account.' : 'Please use the employer portal for this account.');
      }
      this.session = session;
      this.password = '';
      await this.loadOverview();
    } catch (error) {
      this.status = error instanceof Error ? error.message : 'Unable to sign in with those credentials.';
    } finally {
      this.busy = false;
    }
  }

  async continueWithGoogle(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.status = '';
    try {
      const response = await this.api.googleLogin();
      if (response.enabled && response.redirectUrl) {
        window.location.href = response.redirectUrl;
        return;
      }
      this.status = response.message || 'Google sign-in is not available yet.';
    } catch {
      this.status = 'Google sign-in is temporarily unavailable.';
    } finally {
      this.busy = false;
    }
  }

  async signOut(): Promise<void> {
    try { await this.api.logout(); } catch { /* The local UI can still be safely cleared. */ }
    this.session = null;
    this.overview = null;
    this.projects = [];
    this.messages = [];
    this.inquiries = [];
    this.tasks = [];
    this.projectMedia = [];
    this.serviceMedia = [];
    this.selectedMediaFile = null;
    this.activeView = 'overview';
    this.status = '';
  }

  async selectView(view: DashboardView): Promise<void> {
    this.activeView = view;
    await this.refreshActiveView();
  }

  async refreshActiveView(): Promise<void> {
    if (this.busy || !this.session) return;
    this.busy = true;
    this.status = '';
    try {
      if (this.activeView === 'overview') await this.loadOverview();
      if (this.activeView === 'projects') this.projects = await this.api.projects(this.isEmployer);
      if (this.activeView === 'messages') this.messages = await this.api.messages();
      if (this.activeView === 'inquiries' && this.isAdmin) this.inquiries = await this.api.inquiries();
      if (this.activeView === 'workspace' && this.canManageProjects) {
        this.tasks = await this.api.tasks();
        this.projectMedia = await this.api.projectMedia();
        this.serviceMedia = await this.api.serviceMedia();
      }
    } catch {
      this.status = 'This information is unavailable for your current role.';
    } finally {
      this.busy = false;
    }
  }

  async sendMessage(): Promise<void> {
    const content = this.messageDraft.trim();
    if (!content || this.busy) return;
    this.busy = true;
    try {
      await this.api.sendMessage(content);
      this.messageDraft = '';
      this.messages = await this.api.messages();
    } catch {
      this.status = 'Your message could not be sent.';
    } finally {
      this.busy = false;
    }
  }

  get activeMediaFiles(): PortalMediaFile[] {
    return this.mediaScope === 'projects' ? this.projectMedia : this.serviceMedia;
  }

  onMediaSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.selectedMediaFile = input?.files?.[0] ?? null;
  }

  async uploadSelectedMedia(): Promise<void> {
    if (!this.selectedMediaFile || this.busy || !this.canManageProjects) return;
    this.busy = true;
    this.status = '';
    try {
      const uploaded = await this.api.uploadMedia(this.mediaScope, this.selectedMediaFile);
      if (this.mediaScope === 'projects') this.projectMedia = [uploaded, ...this.projectMedia];
      if (this.mediaScope === 'services') this.serviceMedia = [uploaded, ...this.serviceMedia];
      this.selectedMediaFile = null;
      this.status = 'Image uploaded successfully.';
    } catch {
      this.status = 'Image upload failed.';
    } finally {
      this.busy = false;
    }
  }

  async removeMedia(id: string): Promise<void> {
    if (this.busy || !this.canManageProjects) return;
    this.busy = true;
    this.status = '';
    try {
      await this.api.deleteMedia(this.mediaScope, id);
      if (this.mediaScope === 'projects') this.projectMedia = this.projectMedia.filter((file) => file.id !== id);
      if (this.mediaScope === 'services') this.serviceMedia = this.serviceMedia.filter((file) => file.id !== id);
      this.status = 'Image removed.';
    } catch {
      this.status = 'Unable to remove image.';
    } finally {
      this.busy = false;
    }
  }

  private async restoreSession(): Promise<void> {
    try {
      this.session = await this.api.currentSession();
      await this.loadOverview();
    } catch {
      this.session = null;
    }
  }

  private async loadOverview(): Promise<void> {
    this.overview = await this.api.overview(this.isEmployer);
  }
}

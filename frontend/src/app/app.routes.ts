import { Routes } from '@angular/router';
import { ContactPageComponent } from './pages/contact.page';
import { DashboardPageComponent } from './pages/dashboard.page';
import { HomePageComponent } from './pages/home.page';
import { ProjectsPageComponent } from './pages/projects.page';
import { ServicesPageComponent } from './pages/services.page';

export const routes: Routes = [
  { path: '', component: HomePageComponent, title: 'SK Jangid & Associates | Designed By You' },
  { path: 'services', component: ServicesPageComponent, title: 'Services | SK Jangid & Associates' },
  { path: 'projects', component: ProjectsPageComponent, title: 'Projects | SK Jangid & Associates' },
  { path: 'contact', component: ContactPageComponent, title: 'Contact | SK Jangid & Associates' },
  { path: 'portal', component: DashboardPageComponent, title: 'Portal | SK Jangid & Associates' },
  { path: '**', redirectTo: '' },
];

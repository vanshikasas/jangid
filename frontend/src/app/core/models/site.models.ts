export interface Service {
  id: string;
  number: string;
  title: string;
  summary: string;
  details: string[];
  image: string;
}

export interface Project {
  id: string;
  title: string;
  category: string;
  place: string;
  image: string;
  status?: string;
  clientStatus?: string;
}

export interface ClientInquiry {
  name: string;
  email: string;
  projectType: 'Residential' | 'Commercial' | 'Hospitality' | 'Interiors' | 'Other';
  message: string;
}

export interface EmploymentInquiry {
  name: string;
  email: string;
  phone: string;
  position: string;
  portfolioUrl: string;
  message: string;
}

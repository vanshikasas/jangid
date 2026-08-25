import { ArrowUpRight } from 'lucide-react';

export function ProjectCard({ project, priority = false }) {
  return (
    <article className="project-card">
      <div className="project-card__image-wrap">
        <img
          className="project-card__image"
          src={project.image}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      </div>
      <div className="project-card__meta">
        <div>
          <span>{project.category}</span>
          <h3>{project.title}</h3>
        </div>
        <span className="project-card__place">{project.place}</span>
        <span className="project-card__arrow" aria-label={`View ${project.title}`}><ArrowUpRight size={18} /></span>
      </div>
    </article>
  );
}

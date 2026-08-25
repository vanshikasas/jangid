import { PageIntro } from '../components/PageIntro.jsx';
import { ProjectCard } from '../components/ProjectCard.jsx';
import { projects } from '../data/site.js';

export function ProjectsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Selected work"
        title="Architecture is a record of attention."
        copy="A growing collection of spaces designed to feel inevitable in their setting and personal to the people inside them."
      />
      <section className="projects-section">
        <div className="projects-section__filter" aria-label="Project types">
          <span>All work</span>
          <span>Residential</span>
          <span>Commercial</span>
          <span>Hospitality</span>
        </div>
        <div className="project-grid">
          {projects.map((project, index) => <ProjectCard project={project} priority={index < 2} key={project.title} />)}
        </div>
      </section>
    </>
  );
}

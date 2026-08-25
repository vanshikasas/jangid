import { ArrowDownRight, ArrowRight } from 'lucide-react';
import { ProjectCard } from '../components/ProjectCard.jsx';
import { projects, serviceGroups } from '../data/site.js';

export function HomePage() {
  return (
    <>
      <section className="home-hero">
        <div className="home-hero__image" />
        <div className="home-hero__veil" />
        <div className="home-hero__grid-lines" aria-hidden="true" />
        <div className="home-hero__content">
          <span className="hero-kicker">SK Jangid &amp; Associates</span>
          <h1>Spaces that become part of your story.</h1>
          <div className="home-hero__footer">
            <p>Architecture and interiors conceived around the way you want to live, work, and gather.</p>
            <a className="hero-link" href="/projects">Explore selected work <ArrowDownRight size={20} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <section className="statement-section section-pad">
        <div className="statement-section__aside"><span className="eyebrow">01 / Approach</span></div>
        <div className="statement-section__content">
          <p className="display-copy">We turn a brief into a place with presence: rigorous in its details, generous in how it feels.</p>
          <a className="text-link" href="/services">How we work <ArrowRight size={17} aria-hidden="true" /></a>
        </div>
      </section>

      <section className="services-preview section-pad">
        <div className="section-heading">
          <span className="eyebrow">02 / Expertise</span>
          <h2>A complete point of view, from first line to final finish.</h2>
        </div>
        <div className="services-list">
          {serviceGroups.map((service) => (
            <a href="/services" className="service-row" key={service.number}>
              <span className="service-row__number">{service.number}</span>
              <h3>{service.title}</h3>
              <p>{service.summary}</p>
              <ArrowRight className="service-row__arrow" size={20} aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>

      <section className="featured-work section-pad">
        <div className="section-heading section-heading--work">
          <span className="eyebrow">03 / Selected work</span>
          <a className="text-link" href="/projects">View all projects <ArrowRight size={17} aria-hidden="true" /></a>
        </div>
        <div className="project-grid project-grid--home">
          {projects.slice(0, 2).map((project, index) => <ProjectCard project={project} priority={index === 0} key={project.title} />)}
        </div>
      </section>

      <section className="home-contact">
        <p>Have a site, an idea, or a beginning?</p>
        <a href="/contact">Let&apos;s make it considered <ArrowRight size={22} aria-hidden="true" /></a>
      </section>
    </>
  );
}

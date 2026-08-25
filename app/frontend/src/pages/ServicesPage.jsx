import { ArrowRight, Check } from 'lucide-react';
import { PageIntro } from '../components/PageIntro.jsx';
import { serviceGroups } from '../data/site.js';

export function ServicesPage() {
  return (
    <>
      <PageIntro
        eyebrow="Services"
        title="A practiced balance of imagination and precision."
        copy="We guide each project through a deliberate process, connecting the big idea to the smallest decision."
      />
      <section className="service-detail-list">
        {serviceGroups.map((service) => (
          <article className="service-detail" key={service.number}>
            <span className="service-detail__number">{service.number}</span>
            <div>
              <h2>{service.title}</h2>
              <p>{service.summary}</p>
            </div>
            <ul>
              {service.details.map((detail) => <li key={detail}><Check size={16} aria-hidden="true" /> {detail}</li>)}
            </ul>
          </article>
        ))}
      </section>
      <section className="process-section">
        <div className="process-section__heading">
          <span className="eyebrow">Our process</span>
          <h2>Clear at every stage.</h2>
        </div>
        <ol className="process-list">
          <li><span>01</span><div><h3>Discover</h3><p>We listen for the practical needs, aspirations, context, and character of the brief.</p></div></li>
          <li><span>02</span><div><h3>Develop</h3><p>Ideas become coordinated spaces, materials, and details with a coherent visual language.</p></div></li>
          <li><span>03</span><div><h3>Deliver</h3><p>We stay close to the work, helping the design remain intact as it becomes built reality.</p></div></li>
        </ol>
      </section>
      <section className="service-cta">
        <p>Bring us in at the beginning.</p>
        <a className="button button--light" href="/contact">Discuss your project <ArrowRight size={17} aria-hidden="true" /></a>
      </section>
    </>
  );
}

import { ArrowUpRight } from 'lucide-react';
import { ContactForm } from '../components/ContactForm.jsx';
import { PageIntro } from '../components/PageIntro.jsx';

export function ContactPage() {
  return (
    <>
      <PageIntro
        eyebrow="Contact"
        title="A thoughtful place starts with a good conversation."
        copy="Tell us about your site, your timeline, or the question you are beginning with."
      />
      <section className="contact-section">
        <ContactForm />
        <aside className="contact-aside">
          <span className="eyebrow">Studio enquiries</span>
          <p>We welcome private residential, commercial, hospitality, and interior design enquiries.</p>
          <a href="/services">Explore our services <ArrowUpRight size={17} aria-hidden="true" /></a>
        </aside>
      </section>
    </>
  );
}

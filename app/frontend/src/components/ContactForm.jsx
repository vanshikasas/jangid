import { ArrowRight } from 'lucide-react';
import { useState } from 'react';

const initialForm = { name: '', email: '', projectType: '', message: '' };

export function ContactForm() {
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState('');
  const endpoint = import.meta.env.VITE_CONTACT_ENDPOINT;

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('');

    if (!endpoint) {
      setStatus('Enquiries are not enabled in this preview.');
      return;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error('Contact request rejected');
      setForm(initialForm);
      setStatus('Thank you. Your enquiry has been received.');
    } catch {
      setStatus('We could not send your enquiry. Please try again shortly.');
    }
  }

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <label>
        <span>Your name</span>
        <input name="name" type="text" autoComplete="name" value={form.name} onChange={updateField} required />
      </label>
      <label>
        <span>Email address</span>
        <input name="email" type="email" autoComplete="email" value={form.email} onChange={updateField} required />
      </label>
      <label>
        <span>Project type</span>
        <select name="projectType" value={form.projectType} onChange={updateField} required>
          <option value="" disabled>Select an option</option>
          <option value="Residential">Residential</option>
          <option value="Commercial">Commercial</option>
          <option value="Hospitality">Hospitality</option>
          <option value="Interiors">Interiors</option>
          <option value="Other">Other</option>
        </select>
      </label>
      <label className="contact-form__message">
        <span>Tell us about your project</span>
        <textarea name="message" rows="5" value={form.message} onChange={updateField} required />
      </label>
      <div className="contact-form__submit-row">
        <button className="button button--dark" type="submit">
          Send enquiry <ArrowRight size={17} aria-hidden="true" />
        </button>
        <p className="form-status" role="status">{status}</p>
      </div>
    </form>
  );
}

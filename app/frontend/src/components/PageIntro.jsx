export function PageIntro({ eyebrow, title, copy }) {
  return (
    <section className="page-intro">
      <div className="page-intro__grid">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
    </section>
  );
}

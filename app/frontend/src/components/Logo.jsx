export function Logo({ compact = false }) {
  return (
    <a className={`brand ${compact ? 'brand--compact' : ''}`} href="/" aria-label="SK Jangid & Associates home">
      <img src="/brand/skja-logo.png" alt="SK Jangid & Associates" />
    </a>
  );
}

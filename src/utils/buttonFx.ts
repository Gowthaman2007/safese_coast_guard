/** Adds a material-style click ripple to every <button> inside #root. */
export function installButtonFx() {
  if (typeof document === 'undefined') return;
  document.addEventListener('pointerdown', (e) => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest?.('#root button') as HTMLButtonElement | null;
    if (!btn || btn.disabled || btn.classList.contains('no-fx')) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    window.setTimeout(() => ripple.remove(), 650);
  }, { passive: true });
}

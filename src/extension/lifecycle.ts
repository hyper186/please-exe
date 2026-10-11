export function bindPageLifecycle(target: Window, suspend: () => void, resume: () => void) {
  const onHide = () => suspend();
  const onShow = (event: PageTransitionEvent) => { if (event.persisted) resume(); };
  target.addEventListener('pagehide', onHide); target.addEventListener('pageshow', onShow);
  return () => { target.removeEventListener('pagehide', onHide); target.removeEventListener('pageshow', onShow); };
}

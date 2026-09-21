// All scripted motion uses the same tokens as CSS and honours the OS preference.
export const motionAllowed = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;

export const playMotion = (element, keyframes, { duration = '--motion-base', delay = 0, easing = '--ease-out' } = {}) => {
  if (!element?.isConnected || !motionAllowed()) return;
  const style = getComputedStyle(element);
  const time = style.getPropertyValue(duration).trim();
  const milliseconds = parseFloat(time) * (time.endsWith('ms') ? 1 : 1000);
  if (!milliseconds) return;
  return element.animate(keyframes, {
    duration: milliseconds, delay,
    easing: style.getPropertyValue(easing).trim() || 'ease-out', fill: 'backwards'
  });
};

export const enterScreen = root => {
  if (!motionAllowed()) return;
  [...root.children].filter(element => {
    const rect = element.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < innerHeight;
  }).slice(0, 6).forEach((element, index) => playMotion(element, [
    { opacity: 0, transform: 'translateY(10px)' },
    { opacity: 1, transform: 'none' }
  ], { delay: index * 25 }));
};

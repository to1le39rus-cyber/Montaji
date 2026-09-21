import { icon } from './icons.js';
import { motionAllowed } from './motion.js';

// Native touch scrolling; JavaScript only handles navigation and position.
export const createCarousel = ({ items, label, activeId, onActiveChange = () => {} }) => {
  const element = document.createElement('section');
  element.className = 'app-carousel';
  element.setAttribute('aria-label', label);
  element.setAttribute('aria-roledescription', 'карусель');
  element.dataset.count = String(items.length);
  const track = document.createElement('div');
  track.className = 'carousel-track';
  const slides = items.map((item, index) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'слайд');
    slide.setAttribute('aria-label', `${index + 1} из ${items.length}`);
    slide.append(item.content); track.append(slide); return slide;
  });
  const controls = document.createElement('div');
  controls.className = 'carousel-controls';
  controls.hidden = true;
  controls.innerHTML = '<div class="carousel-position"><span class="carousel-counter" role="status" aria-live="polite" aria-atomic="true"></span><span class="carousel-progress" aria-hidden="true"><span></span></span></div><div class="carousel-arrows"><button type="button" class="icon-button" aria-label="Предыдущая заметка">'+icon('back')+'</button><button type="button" class="icon-button" aria-label="Следующая заметка">'+icon('chevron')+'</button></div>';
  const [previous, next] = controls.querySelectorAll('button');
  const counter = controls.querySelector('.carousel-counter');
  const progress = controls.querySelector('.carousel-progress>span');
  element.append(track, controls);
  let index = Math.max(0, items.findIndex(item => item.id === activeId));
  let frame = 0, settleTimer = 0, resizeObserver;
  const target = position => Math.max(0, Math.min(
    slides[position]?.offsetLeft || 0, track.scrollWidth - track.clientWidth
  ));
  const displayPosition = () => {
    controls.hidden = track.scrollWidth <= track.clientWidth + 1;
    previous.disabled = index === 0;
    next.disabled = index === items.length - 1;
    counter.textContent = `${index + 1} из ${items.length}`;
    progress.style.transform = `scaleX(${(index + 1) / items.length})`;
    slides.forEach((slide, position) => slide.dataset.active = String(position === index));
  };
  const updatePosition = () => {
    if (!element.isConnected) return;
    const nearest = slides.reduce((best, slide, position) =>
      Math.abs(track.scrollLeft - target(position)) < Math.abs(track.scrollLeft - target(best)) ? position : best, 0);
    if (nearest !== index) {
      index = nearest;
      displayPosition();
      onActiveChange(items[index].id);
    }
  };
  const goTo = position => {
    const nextIndex = Math.max(0, Math.min(items.length - 1, position));
    track.scrollTo({ left: target(nextIndex), behavior: motionAllowed() ? 'smooth' : 'auto' });
  };
  previous.onclick = () => goTo(index - 1);
  next.onclick = () => goTo(index + 1);
  track.addEventListener('scroll', () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(updatePosition, 120);
  }, { passive: true });
  track.addEventListener('scrollend', updatePosition);
  track.addEventListener('keydown', event => {
    const direction = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (direction === undefined && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const position = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 :
      Math.max(0, Math.min(items.length - 1, index + direction));
    slides[position]?.querySelector('button,a[href]')?.focus({ preventScroll: true });
    goTo(position);
  });
  return {
    element,
    mount() {
      const restore = () => {
        if (!element.isConnected) return;
        track.scrollTo({ left: target(index), behavior: 'auto' });
        displayPosition();
      };
      restore();
      frame = requestAnimationFrame(() => {
        restore();
        resizeObserver = new ResizeObserver(restore);
        resizeObserver.observe(track);
      });
    },
    destroy() {
      cancelAnimationFrame(frame); clearTimeout(settleTimer); resizeObserver?.disconnect();
    }
  };
};

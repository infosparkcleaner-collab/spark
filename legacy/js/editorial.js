(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hero = document.querySelector('.intro');
  const product = document.querySelector('.intro__product');
  if (reduced || !window.gsap || !window.ScrollTrigger) return;
  const gsap = window.gsap;
  gsap.from('.intro__copy > *', { y: 32, opacity: 0, stagger: .12, duration: 1, delay: .65, ease: 'power3.out' });
  gsap.from('.intro__visual', { y: 55, opacity: 0, duration: 1.4, delay: .8, ease: 'power3.out' });
  gsap.to(product, { y: -70, rotation: -3, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 1 } });
  gsap.to('.intro__copy', { y: -35, opacity: .2, ease: 'none', scrollTrigger: { trigger: hero, start: '45% top', end: 'bottom top', scrub: 1 } });
  if (matchMedia('(hover: hover)').matches) {
    const moveX = gsap.quickTo('.intro__visual', 'x', { duration: 1, ease: 'power3.out' });
    const moveY = gsap.quickTo('.intro__visual', 'y', { duration: 1, ease: 'power3.out' });
    hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); moveX((e.clientX / r.width - .5) * 18); moveY(((e.clientY-r.top) / r.height - .5) * 14); });
    hero.addEventListener('pointerleave', () => { moveX(0); moveY(0); });
  }
})();

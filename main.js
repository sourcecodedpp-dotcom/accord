// main.js - Vanilla JS for Intelligence Designed To Evolve

(function () {
  'use strict';

  // --- 1. Count-Up Animation for Stats Footer ---
  const statCards = document.querySelectorAll('.stat-card');

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function animateStatCard(card, index) {
    const target = parseFloat(card.dataset.target || '0');
    const decimals = parseInt(card.dataset.decimals || '0', 10);
    const numberEl = card.querySelector('.stat-number');
    if (!numberEl) return;

    const duration = 1500 + index * 80;
    const startOffset = 480 + index * 90;

    setTimeout(() => {
      let startTime = null;

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = easeOutCubic(progress);
        const currentVal = eased * target;

        numberEl.textContent = currentVal.toFixed(decimals);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          numberEl.textContent = target.toFixed(decimals);
        }
      }

      requestAnimationFrame(step);
    }, startOffset);
  }

  if ('IntersectionObserver' in window && statCards.length > 0) {
    let triggered = false;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !triggered) {
            triggered = true;
            statCards.forEach((card, i) => animateStatCard(card, i));
            observer.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );

    const statsFooter = document.querySelector('.stats-footer');
    if (statsFooter) {
      observer.observe(statsFooter);
    } else {
      statCards.forEach((card, i) => animateStatCard(card, i));
    }
  } else {
    statCards.forEach((card, i) => animateStatCard(card, i));
  }

  // --- 2. Mobile Menu Handling (<=720px) ---
  const burgerBtn = document.querySelector('.burger-btn');
  const mobileOverlay = document.getElementById('mobile-overlay');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link, .mobile-sign-in-btn');

  function openMenu() {
    if (!burgerBtn || !mobileMenu || !mobileOverlay) return;
    burgerBtn.setAttribute('aria-expanded', 'true');
    mobileOverlay.removeAttribute('hidden');
    mobileMenu.removeAttribute('hidden');
    document.body.classList.add('menu-open');
  }

  function closeMenu() {
    if (!burgerBtn || !mobileMenu || !mobileOverlay) return;
    burgerBtn.setAttribute('aria-expanded', 'false');
    mobileOverlay.setAttribute('hidden', '');
    mobileMenu.setAttribute('hidden', '');
    document.body.classList.remove('menu-open');
  }

  function toggleMenu() {
    const isExpanded = burgerBtn.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  if (burgerBtn) {
    burgerBtn.addEventListener('click', toggleMenu);
  }

  if (mobileOverlay) {
    mobileOverlay.addEventListener('click', closeMenu);
  }

  mobileLinks.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 720) {
      closeMenu();
    }
  });
})();

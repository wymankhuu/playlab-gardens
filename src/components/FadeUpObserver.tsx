'use client';

import { useEffect } from 'react';

export default function FadeUpObserver() {
  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.fade-up').forEach((el) => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );

    // Observe initial elements
    document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));

    // Re-observe on DOM changes (for lazy-loaded content)
    const mutationObserver = new MutationObserver(() => {
      document.querySelectorAll('.fade-up:not(.visible)').forEach((el) => observer.observe(el));
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return null;
}

/* ==========================================================================
   Alder Dental Studio — interactions
   Sections: header scroll state, mobile nav, scroll reveal, FAQ accordion,
   testimonial carousel, before/after compare slider, booking form.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Sticky header shrink state ---------- */
  const header = document.getElementById('siteHeader');
  const onScroll = () => {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile nav toggle ---------- */
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');

  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('open');
    navToggle.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  // Close mobile nav after tapping a link
  mainNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      navToggle.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- Scroll reveal animations ---------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    // Fallback: just show everything
    revealEls.forEach(el => el.classList.add('in-view'));
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(item => {
    const question = item.querySelector('.faq-question');
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close other open items for a clean single-open accordion
      document.querySelectorAll('.faq-item.open').forEach(open => {
        if (open !== item) {
          open.classList.remove('open');
          open.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
        }
      });

      item.classList.toggle('open', !isOpen);
      question.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  /* ---------- Testimonial carousel ---------- */
  const testimonials = Array.from(document.querySelectorAll('.testimonial'));
  const dotsWrap = document.getElementById('carouselDots');
  const prevBtn = document.getElementById('prevReview');
  const nextBtn = document.getElementById('nextReview');
  let current = 0;
  let autoTimer;

  // Build dots
  testimonials.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.setAttribute('aria-label', `Show review ${i + 1}`);
    if (i === 0) dot.classList.add('active');
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

function goTo(index) {
  testimonials[current].classList.remove('active');
  dots[current].classList.remove('active');
  current = (index + testimonials.length) % testimonials.length;
  testimonials[current].classList.add('active');
  dots[current].classList.add('active');
  setTrackHeight();
}

function setTrackHeight() {
  const track = document.getElementById('testimonialTrack');
  const activeSlide = testimonials[current];
  track.style.height = `${activeSlide.scrollHeight}px`;
}

  function restartAutoplay() {
    clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(current + 1), 7000);
  }

  prevBtn.addEventListener('click', () => { goTo(current - 1); restartAutoplay(); });
  nextBtn.addEventListener('click', () => { goTo(current + 1); restartAutoplay(); });

  if (testimonials.length > 1) restartAutoplay();

  /* ---------- Before / After compare slider ---------- */
  const compareRange = document.getElementById('compareRange');
  const compareBefore = document.getElementById('compareBefore');
  const compareHandle = document.getElementById('compareHandle');

  function updateCompare(value) {
    compareBefore.style.clipPath = `inset(0 ${100 - value}% 0 0)`;
    compareHandle.style.left = `${value}%`;
  }
  if (compareRange) {
    updateCompare(compareRange.value);
    compareRange.addEventListener('input', (e) => updateCompare(e.target.value));
  }

  /* ---------- Booking form ---------- */
  const bookingForm = document.getElementById('bookingForm');
  const formNote = document.getElementById('formNote');

  if (bookingForm) {
    // Prevent picking a date in the past
    const dateInput = document.getElementById('date');
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0];
      dateInput.setAttribute('min', today);
    }

    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      let valid = true;
      bookingForm.querySelectorAll('[required]').forEach(field => {
        field.classList.add('touched');
        if (!field.value) valid = false;
      });

      if (!valid) {
        formNote.textContent = 'Please fill in the highlighted fields.';
        formNote.style.color = '#C4574A';
        return;
      }

      // NOTE: This is a front-end only demo. Wire this up to your backend,
      // booking system (e.g. a scheduling API), or a service like Formspree
      // to actually receive appointment requests.
      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const date = document.getElementById('date').value;
      const reason = document.getElementById('reason').value;

      formNote.style.color = '';
      formNote.textContent = 'Sending your request...';

      try {
        const res = await fetch('/.netlify/functions/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, date, reason }),
        });

        if (!res.ok) throw new Error('Request failed');

        formNote.textContent = `Thanks, ${name.split(' ')[0]}! We'll be in touch shortly to confirm your visit.`;
        bookingForm.reset();
      } catch (err) {
        formNote.style.color = '#C4574A';
        formNote.textContent = 'Something went wrong — please call us directly at (555) 123-4567.';
      }
    });
  }

  /* ---------- Footer year ---------- */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

});

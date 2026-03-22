/* ==========================================
   Playlab Gardens — Share Your App
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('share-form');
  const submitBtn = document.getElementById('submit-btn');
  const successState = document.getElementById('success-state');
  const formContainer = document.getElementById('form-container');

  const requiredFields = [
    { id: 'app-name', label: 'App Name' },
    { id: 'app-url', label: 'Playlab URL' },
    { id: 'creator', label: 'Your Name' },
    { id: 'role', label: 'Your Role' },
    { id: 'description', label: 'Description' },
    { id: 'usage', label: 'How It\'s Being Used' },
    { id: 'impact', label: 'Impact' },
  ];

  // Clear error on input
  requiredFields.forEach(({ id }) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => clearFieldError(el));
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate
    let hasError = false;
    clearAllErrors();

    for (const { id, label } of requiredFields) {
      const el = document.getElementById(id);
      if (!el.value.trim()) {
        showFieldError(el, `${label} is required`);
        hasError = true;
      }
    }

    if (hasError) {
      // Scroll to first error
      const firstError = form.querySelector('.form-group--error');
      if (firstError) firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const data = {
      appName: document.getElementById('app-name').value,
      url: document.getElementById('app-url').value,
      creator: document.getElementById('creator').value,
      role: document.getElementById('role').value,
      description: document.getElementById('description').value,
      usage: document.getElementById('usage').value,
      impact: document.getElementById('impact').value,
      publicConsent: document.getElementById('public-consent').checked,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    try {
      const res = await fetch('/api/submit-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Your App';
        showFormError(result.error || 'Something went wrong. Please try again.');
        return;
      }

      showSubmitSuccessModal();
      form.reset();
    } catch (err) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Your App';
      showFormError('Network error. Please check your connection and try again.');
    }
  });
});

function showFieldError(el, message) {
  const group = el.closest('.form-group');
  if (!group) return;
  group.classList.add('form-group--error');
  el.classList.add('form-input--error');

  // Add error message if not already present
  if (!group.querySelector('.form-error')) {
    const err = document.createElement('span');
    err.className = 'form-error';
    err.textContent = message;
    group.appendChild(err);
  }
}

function clearFieldError(el) {
  const group = el.closest('.form-group');
  if (!group) return;
  group.classList.remove('form-group--error');
  el.classList.remove('form-input--error');
  const err = group.querySelector('.form-error');
  if (err) err.remove();
}

function clearAllErrors() {
  document.querySelectorAll('.form-group--error').forEach(g => g.classList.remove('form-group--error'));
  document.querySelectorAll('.form-input--error').forEach(el => el.classList.remove('form-input--error'));
  document.querySelectorAll('.form-error').forEach(el => el.remove());
}

function showSubmitSuccessModal() {
  const existing = document.getElementById('submit-success-modal');
  if (existing) existing.remove();

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = false;
  submitBtn.textContent = 'Submit Your App';

  const modal = document.createElement('div');
  modal.id = 'submit-success-modal';
  modal.className = 'submit-success-overlay';
  modal.innerHTML = `
    <div class="submit-success-modal">
      <div class="submit-success-icon">🌱</div>
      <h3 class="submit-success-title">Thank you for helping Playlab cultivate our Community Gardens.</h3>
      <p class="submit-success-text">Your app has been submitted.</p>
      <button class="submit-success-btn" id="submit-success-close">Continue</button>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('submit-success-close').addEventListener('click', function() {
    modal.classList.add('closing');
    setTimeout(function() { modal.remove(); }, 150);
  });
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.classList.add('closing');
      setTimeout(function() { modal.remove(); }, 150);
    }
  });
}

function showFormError(message) {
  const existing = document.querySelector('.form-error-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.className = 'form-error-banner';
  banner.textContent = message;
  const form = document.getElementById('share-form');
  form.prepend(banner);
}

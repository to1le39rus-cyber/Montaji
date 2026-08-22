// Auth safety guard: never allow the mobile browser to navigate away
// from the login screen because of a native form submission.
document.addEventListener('submit', event => {
  if (event.target?.id === 'authForm') {
    event.preventDefault();
  }
}, true);

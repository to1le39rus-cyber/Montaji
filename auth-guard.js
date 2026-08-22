// Boot safety + Notes feature bootstrap.
document.addEventListener('submit', event => {
  if (event.target?.id === 'authForm') event.preventDefault();
}, true);

(() => {
  const load = () => {
    if (!document.querySelector('link[data-notes-css]')) {
      const css=document.createElement('link');
      css.rel='stylesheet'; css.href='notes.css?v=1-20260822'; css.dataset.notesCss='1';
      document.head.appendChild(css);
    }
    if (!document.querySelector('script[data-notes-module]')) {
      const script=document.createElement('script');
      script.type='module'; script.src='notes.js?v=1-20260822'; script.dataset.notesModule='1';
      document.body.appendChild(script);
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load, { once:true });
  else load();
})();

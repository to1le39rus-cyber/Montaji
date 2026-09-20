export const createFeedback = root => {
  const live = document.createElement('div'); live.className = 'app-feedback'; live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite'); live.hidden = true; root.append(live);
  let timer;
  return (message, action) => {
    clearTimeout(timer); live.replaceChildren(); live.hidden = false;
    const text = document.createElement('span'); text.textContent = message; live.append(text);
    if (action) { const button = document.createElement('button'); button.type = 'button'; button.textContent = action.label; button.onclick = async () => { button.disabled = true; try { await action.run(); live.hidden = true; } catch (e) { text.textContent = e.message; button.disabled = false; } }; live.append(button); }
    timer = setTimeout(() => live.hidden = true, action ? 10000 : 5000);
  };
};

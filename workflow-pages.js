(() => {
  const el = id => document.getElementById(id);
  let page = 0, reviewOnly = false;
  const titles = ['Antal system', 'System', 'Tagglista', 'Projektuppgifter', 'Granskning', 'XML-export'];
  const footer = document.createElement('div'); footer.className = 'workflow-page-navigation hidden';
  const previous = document.createElement('button'); previous.type = 'button'; previous.className = 'button'; previous.textContent = '← Tillbaka';
  const title = document.createElement('span'); title.setAttribute('aria-live', 'polite');
  const next = document.createElement('button'); next.type = 'button'; next.className = 'button primary'; next.textContent = 'Fortsätt →';
  footer.append(previous, title, next); document.querySelector('.wrap').append(footer);
  const hidden = (node, value) => node?.classList.toggle('wizard-hidden', value);
  function ready() {
    if (page === 0) return Number(el('systemCount').value) > 0;
    if (page === 1) return [...document.querySelectorAll('.system-profile-row')].every(row => row.querySelector('[data-profile-type]')?.value && row.querySelector('[data-profile-prefix]')?.value.trim() && (!row.querySelector('[data-profile-service-area]') || row.querySelector('[data-profile-service-area]').value));
    if (page === 2.5) return window.ECO_DK_REVIEW?.ready();
    if (page === 2) return !el('results').classList.contains('hidden');
    if (page === 3) return !el('runReview').disabled;
    if (page === 4) return !reviewOnly && !el('step2Button').disabled;
    return false;
  }
  function draw(scroll = true) {
    footer.classList.remove('hidden');
    if (page === 5) el('step2Button').click(); else if (!reviewOnly) el('step1Button').click();
    if (page === 0) el('airTreatmentSetup').classList.remove('hidden');
    if (page === 1) el('systemProfilesPanel').classList.remove('hidden');
    if (page >= 2) el('workflow').classList.remove('hidden');
    hidden(el('airTreatmentSetup'), page !== 0);
    hidden(el('systemProfilesPanel'), page !== 1);
    hidden(el('systemSelectionHero'), page > 1);
    hidden(el('workflow'), page < 2 || page === 2.5);
    hidden(el('dkAlarmPanel'), page !== 2.5);
    if (page === 2.5) window.ECO_DK_REVIEW?.refresh();
    hidden(document.querySelector('.workflow-hero'), true);
    hidden(el('step1Panel'), page === 5);
    hidden(el('step2Panel'), page !== 5);
    for (const id of ['tagListFormatControl', 'drop']) hidden(el(id), page !== 2);
    hidden(document.querySelector('.paste-taglist'), page !== 2);
    hidden(document.querySelector('.tag-group-questions'), page !== 3);
    hidden(el('reviewContent'), page !== 4);
    hidden(el('nextStepControl'), true); hidden(el('step1Button').parentElement, true);
    hidden(el('continueAirTreatment'), true); hidden(el('runReview'), true);
    title.textContent = page === 2.5 ? "DK Larmkontroll" : titles[page]; previous.disabled = page === (reviewOnly ? 2 : 0);
    next.classList.toggle('hidden', page === 5 || reviewOnly && page === 4);
    next.disabled = !ready();
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
  }
  next.addEventListener('click', () => {
    if (!ready()) return;
    if (page === 0) { el('continueAirTreatment').click(); page = 1; }
    else if (page === 3) { el('runReview').click(); return; }
    else if (page === 2) page = 2.5;
    else if (page === 2.5) page = 3;
    else page++;
    draw();
  });
  previous.addEventListener('click', () => { if (page > (reviewOnly ? 2 : 0)) { page = page === 3 ? 2.5 : page === 2.5 ? 2 : page - 1; draw(); } });
  document.addEventListener('workflow-uploaded', () => { page = 2.5; draw(); });
  document.addEventListener('workflow-reviewed', () => { page = 4; draw(); });
  el('integrationButton').addEventListener('click', () => { if (!drawing) { reviewOnly = false; page = 0; draw(); } });
  el('reviewModeButton').addEventListener('click', () => { reviewOnly = true; page = 2; draw(); });
  el('ioModeButton').addEventListener('click', () => { footer.classList.add('hidden'); hidden(el('dkAlarmPanel'), true); });
  document.addEventListener('input', () => { next.disabled = !ready(); });
  document.addEventListener('change', () => { next.disabled = !ready(); });
  new MutationObserver(() => { next.disabled = !ready(); }).observe(el('runReview'), { attributes:true, attributeFilter:['disabled'] });
  let drawing = false;
  const originalDraw = draw;
  draw = (...args) => { drawing = true; try { originalDraw(...args); } finally { drawing = false; } };
  document.addEventListener('workflow-page-refresh', () => draw(false));
  draw(false);
})();

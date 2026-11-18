(() => {
  const el = id => document.getElementById(id);
  let page = -2, reviewOnly = false;
  const titles = ['Antal system', 'System', 'Tagglista', 'Projektuppgifter', 'Granskning', 'XML-export'];
  const progress = document.createElement('nav');
  progress.className = 'workflow-progress';
  progress.setAttribute('aria-label', 'Steg i arbetsflödet');
  document.querySelector('.wrap').prepend(progress);
  function drawProgress() {
    const imported = window.ECO_FI_DOCUMENTS?.active();
    const steps = reviewOnly
      ? [[2, 'Tagglista'], [2.5, 'Larmkontroll'], [3, 'Granskningsval'], [4, 'Granskning']]
      : [[-2, 'Driftkort'], ...(imported ? [[-1, 'Systemträd']] : [[0, 'Antal system'], [1, 'System']]),
        [2, 'Tagglista'], [imported ? 2.75 : 2.5, imported ? 'Mappning' : 'Larmkontroll'],
        [3, 'Projektuppgifter'], [4, 'Granskning'], [5, 'XML-export']];
    const current = steps.findIndex(([value]) => value === page);
    const list = document.createElement('ol');
    steps.forEach(([value, label], index) => {
      const item = document.createElement('li');
      item.className = index < current ? 'is-complete' : index === current ? 'is-current' : '';
      if (index === current) item.setAttribute('aria-current', 'step');
      const number = document.createElement('span'); number.className = 'workflow-step-number'; number.textContent = index + 1;
      const text = document.createElement('span'); text.textContent = label;
      item.append(number, text); list.append(item);
    });
    const status = document.createElement('p');
    status.textContent = `Steg ${current + 1} av ${steps.length} · ${steps[current]?.[1] ?? ''}`;
    progress.replaceChildren(status, list); progress.classList.remove('hidden');
  }
  const footer = document.createElement('div'); footer.className = 'workflow-page-navigation hidden';
  const previous = document.createElement('button'); previous.type = 'button'; previous.className = 'button'; previous.textContent = '← Tillbaka';
  const title = document.createElement('span'); title.setAttribute('aria-live', 'polite');
  const next = document.createElement('button'); next.type = 'button'; next.className = 'button primary'; next.textContent = 'Fortsätt →';
  footer.append(previous, title, next); document.querySelector('.wrap').append(footer);
  const hidden = (node, value) => node?.classList.toggle('wizard-hidden', value);
  function ready() {
    if (page === -2) return Boolean(window.ECO_FI_DOCUMENTS?.readyUpload());
    if (page === -1) return Boolean(window.ECO_FI_DOCUMENTS?.readyTree());
    if (page === 2.75) return Boolean(window.ECO_FI_DOCUMENTS?.readyTree());
    if (page === 0) return Number(el('systemCount').value) > 0;
    if (page === 1) return [...document.querySelectorAll('.system-profile-row')].every(row => row.querySelector('[data-profile-type]')?.value && row.querySelector('[data-profile-prefix]')?.value.trim() && (!row.querySelector('[data-profile-service-area]') || row.querySelector('[data-profile-service-area]').value));
    if (page === 2.5) return window.ECO_DK_REVIEW?.ready();
    if (page === 2) return !el('results').classList.contains('hidden');
    if (page === 3) return !el('runReview').disabled;
    if (page === 4) return !reviewOnly && !el('step2Button').disabled;
    return false;
  }
  function draw(scroll = true) {
    // Alarms from imported DKs are already reviewed in the system tree.
    // Keep the manual alarm-entry page only for runs without imported DKs.
    if (page === 2.5 && !reviewOnly && window.ECO_FI_DOCUMENTS?.active()) page = 2.75;
    footer.classList.remove('hidden');
    if (page === 5) el('step2Button').click(); else if (!reviewOnly) el('step1Button').click();
    if (page === 0) el('airTreatmentSetup').classList.remove('hidden');
    if (page === 1) el('systemProfilesPanel').classList.remove('hidden');
    if (page >= 2) el('workflow').classList.remove('hidden');
    hidden(el('airTreatmentSetup'), page !== 0);
    hidden(el('systemProfilesPanel'), page !== 1);
    hidden(el('systemSelectionHero'), page < 0 || page > 1);
    hidden(el('workflow'), page < 2 || page === 2.5 || page === 2.75);
    hidden(el('fiDriftkortUpload'), reviewOnly || page !== -2);
    hidden(el('fiTreePanel'), reviewOnly || page !== -1);
    hidden(el('fiMappingPanel'), reviewOnly || page !== 2.75);
    if (page === -1) window.ECO_FI_DOCUMENTS?.renderTree();
    if (page === 2.75) window.ECO_FI_DOCUMENTS?.refreshMapping();
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
    title.textContent = ({'-2':'Driftkort','-1':'Systemträd','2.5':'DK Larmkontroll','2.75':'Mappning DK ↔ tagglista'})[page] ?? titles[page]; previous.disabled = page === (reviewOnly ? 2 : -2);
    next.classList.toggle('hidden', page === 5 || reviewOnly && page === 4);
    next.disabled = !ready();
    drawProgress();
    if (scroll) window.scrollTo({ top: 0, behavior: 'instant' });
  }
  next.addEventListener('click', () => {
    if (!ready()) return;
    if (page === -2) page = -1;
    else if (page === -1) { window.ECO_FI_DOCUMENTS.applyProfiles(); page = 2; }
    else if (page === 0) { el('continueAirTreatment').click(); page = 1; }
    else if (page === 3) { el('runReview').click(); return; }
    else if (page === 2) page = !reviewOnly && window.ECO_FI_DOCUMENTS?.active() ? 2.75 : 2.5;
    else if (page === 2.5) page = 3;
    else if (page === 2.75) page = 3;
    else page++;
    draw();
  });
  previous.addEventListener('click', () => {
    if(page <= (reviewOnly ? 2 : -2))return;
    const dk=!reviewOnly&&window.ECO_FI_DOCUMENTS?.active();
    page = page===3 ? (dk?2.75:2.5) : page===2.75||page===2.5 ? 2 : page===2&&dk ? -1 : page===0 ? -2 : page-1; draw();
  });
  document.addEventListener('workflow-uploaded', () => { page = !reviewOnly&&window.ECO_FI_DOCUMENTS?.active()?2.75:2.5; draw(); });
  document.addEventListener('workflow-reviewed', () => { page = 4; draw(); });
  el('integrationButton').addEventListener('click', () => { if (!drawing) { reviewOnly = false; window.ECO_FI_DOCUMENTS?.activate(); page = -2; draw(); } });
  el('reviewModeButton').addEventListener('click', () => { reviewOnly = true; page = 2; draw(); });
  el('ioModeButton').addEventListener('click', () => { footer.classList.add('hidden'); hidden(el('dkAlarmPanel'), true); });
  for (const id of ['ioModeButton', 'pdfModeButton', 'modbusModeButton']) {
    el(id).addEventListener('click', () => progress.classList.add('hidden'));
  }
  document.addEventListener('input', () => { next.disabled = !ready(); });
  document.addEventListener('change', () => { next.disabled = !ready(); });
  document.addEventListener('fi-state-changed', () => { next.disabled = !ready(); });
  el('fiDkSkip').addEventListener('click', () => { window.ECO_FI_DOCUMENTS?.deactivate(); page = 0; draw(); });
  new MutationObserver(() => { next.disabled = !ready(); }).observe(el('runReview'), { attributes:true, attributeFilter:['disabled'] });
  let drawing = false;
  const originalDraw = draw;
  draw = (...args) => { drawing = true; try { originalDraw(...args); } finally { drawing = false; } };
  document.addEventListener('workflow-page-refresh', () => draw(false));
  draw(false);
})();

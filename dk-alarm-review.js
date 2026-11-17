(() => {
  const el = id => document.getElementById(id);
  const clean = text => String(text ?? '').trim().normalize('NFC');
  const key = text => clean(text).toUpperCase();
  const lists = new Map();
  let currentSystem = '';
  function saveCurrent() { if (currentSystem) lists.set(currentSystem, el('dkAlarmText').value); }
  const tagPattern = /^(?:[A-ZÅÄÖ]+\d+[-_])?[A-ZÅÄÖ][A-ZÅÄÖ0-9]*(?:_[A-ZÅÄÖ0-9]+)+(?:_L|_SL|_BL)$/i;
  const isTag = text => tagPattern.test(text) || /^(?:[A-ZÅÄÖ]+\d+-)?[A-ZÅÄÖ0-9]+_(?:L|SL|BL)$/i.test(text);
  const withPrefix = tag => /^(?:LB|FA|VS|VV|VP|VPU|UC|KA|MV|KB|KV)\d+[-_]/i.test(tag);
  function parse(text) {
    const tokens = text.split(/\r?\n|\t/).map(clean).filter(Boolean);
    const blocks = []; let current;
    for (const token of tokens) {
      if (isTag(token)) { current = { tag: token, values: [] }; blocks.push(current); }
      else if (current) current.values.push(token);
    }
    return blocks.map(block => {
      const values = [...block.values];
      const priority = values.find(v => /^[ABC]$/i.test(v)) ?? '';
      const category = values.find(v => /^\d{2}$/.test(v)) ?? '';
      const time = values.find(v => /^\d+(?:[.,]\d+)?\s*(?:min(?:ut(?:er)?)?|sek(?:und(?:er)?)?|s)\.?$/i.test(v)) ?? '';
      const message = values.filter(v => v !== priority && v !== category && v !== time && !/^(x|vinter|sommar)$/i.test(v)).join(' ');
      return { ...block, priority: priority.toUpperCase(), category, time, message, flags: values.filter(v => /^(x|vinter|sommar)$/i.test(v)), valid: Boolean(category && (!/^[123]/.test(category) || priority)) };
    });
  }
  function refresh() {
    const select = el('dkSystem'), saved = currentSystem || select.value;
    const prefixes = window.ECO_DK_DATA().prefixes;
    select.replaceChildren(new Option('Välj system', ''), ...prefixes.map(p => new Option(p,p)));
    select.value = prefixes.includes(saved) ? saved : prefixes[0] ?? '';
    if (currentSystem !== select.value) {
      saveCurrent(); currentSystem = select.value; el('dkAlarmText').value = lists.get(currentSystem) ?? '';
    }
    const alarms = parse(el('dkAlarmText').value);
    el('dkParseStatus').textContent = alarms.length ? `${alarms.length} larm identifierade · ${alarms.filter(a => !a.valid).length} poster utan klass/kategori.` : 'Ingen DK-larmlista inläst.';
    saveCurrent();
    el('dkSystemProgress').textContent = prefixes.map(prefix => `${prefix}: ${parse(lists.get(prefix) ?? '').length} larm`).join(' · ');
  }
  function ready() {
    saveCurrent();
    return [...lists.values()].every(text => !text.trim() || parse(text).length > 0);
  }
  function seconds(value, fallbackUnit = '') {
    const match = clean(value).replace(',', '.').match(/^([\d.]+)\s*(min(?:ut(?:er)?)?|sek(?:und(?:er)?)?|s)?\.?$/i);
    if (!match) return null;
    const unit = (match[2] || fallbackUnit).replace(/\./g, '');
    if (!/^(min(?:ut(?:er)?)?|sek(?:und(?:er)?)?|s)$/i.test(unit)) return null;
    return Number(match[1]) * (/^min/i.test(unit) ? 60 : 1);
  }
  function render() {
    saveCurrent();
    const alarms = [...lists].flatMap(([system,text]) => parse(text).map(alarm => ({ ...alarm, system })));
    const panel = el('dkAlarmResults'), container = el('dkAlarmCards');
    panel.classList.toggle('hidden', !alarms.length); container.replaceChildren();
    if (!alarms.length) return;
    const rows = window.ECO_DK_DATA().rows;
    const categories = window.ECO_FRAMEWORK?.notificationClasses ?? {};
    const unused = new Set(['28','34','35','36','37','39','44','47','48','49','59','67','68','69']);
    const node = (tag,text,cls) => { const n = document.createElement(tag); n.textContent = text; if(cls) n.className = cls; return n; };
    const table = node('table','', 'dk-results-table');
    const head = document.createElement('thead'), header = document.createElement('tr');
    for(const text of ['System','Larmtagg','Finns i tagglistan','Klass / kategori enligt DK','Bedömning']) header.append(node('th',text));
    head.append(header); table.append(head);
    const body = document.createElement('tbody'); let errors = 0;
    for (const alarm of alarms) {
      const name = withPrefix(alarm.tag) ? alarm.tag : alarm.system + '-' + alarm.tag;
      const exists = rows.some(row => [row.name,row.sourceName,row.description].some(value => key(value).split(/\s+/)[0] === key(name)));
      const category = alarm.category, expected = categories[category];
      const problems = [];
      if (!exists) problems.push('Larmtaggen saknas i tagglistan');
      if (unused.has(category)) problems.push('Kategori ' + category + ' används ej');
      else if (!expected) problems.push('Ogiltig eller saknad larmkategori');
      if (/^[123]\d$/.test(category)) {
        const required = {1:'A',2:'B',3:'C'}[category[0]];
        if(alarm.priority !== required) problems.push('Kategori ' + category + ' ska ha larmklass ' + required);
      }
      if(problems.length) errors++;
      const tr = document.createElement('tr');
      tr.append(node('td',alarm.system),node('td',name));
      const presence = node('td',''); presence.append(node('span',exists ? 'Finns' : 'Saknas','badge badge-' + (exists ? 'success' : 'error'))); tr.append(presence);
      tr.append(node('td',[alarm.priority,category,unused.has(category) ? 'Används ej' : expected].filter(Boolean).join(' · ')));
      const assessment = node('td',''); assessment.append(node('span',problems.length ? 'Fel' : 'Stämmer','badge badge-' + (problems.length ? 'error' : 'success')));
      if(problems.length) assessment.append(node('p',problems.join(' · ')));
      tr.append(assessment); body.append(tr);
    }
    table.append(body); container.append(table);
    el('dkAlarmSummary').textContent = alarms.length + ' DK-larm · ' + (alarms.length-errors) + ' stämmer · ' + errors + ' med avvikelse.';
  }
  el('dkSystem').addEventListener('change', () => {
    saveCurrent(); currentSystem = el('dkSystem').value;
    el('dkAlarmText').value = lists.get(currentSystem) ?? ''; refresh();
  });
  document.addEventListener('workflow-uploaded', () => {
    lists.clear(); currentSystem = ''; el('dkAlarmText').value = ''; refresh();
  });
  el('dkAlarmText').addEventListener('input', refresh);
  window.ECO_DK_REVIEW = { ready, refresh, parse };
  document.addEventListener('workflow-reviewed', render);
})();

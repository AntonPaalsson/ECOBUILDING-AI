(() => {
  // Deliberately limited to known spelling variants. Unknown words (school
  // names, products and component IDs) are never errors just for being unknown.
  const spellings = {
    expantionskärl: 'expansionskärl', expensionskärl: 'expansionskärl',
    rökdetekering: 'rökdetektering', rökdetekterig: 'rökdetektering',
    branddetekering: 'branddetektering', branddetekterig: 'branddetektering',
    driftstop: 'driftstopp', driftstoppetn: 'driftstoppet',
    handmanöve: 'handmanöver',
    tillluft: 'tilluft', tillluftsfläkt: 'tilluftsfläkt', tillluftstemperatur: 'tilluftstemperatur',
    frånluftfläkt: 'frånluftsfläkt', frånluftfläkten: 'frånluftsfläkten',
    frånluftgivare: 'frånluftsgivare', tilluftgivare: 'tilluftsgivare',
    temeratur: 'temperatur', tempratur: 'temperatur', temperartur: 'temperatur',
    temperaur: 'temperatur', temperaturgivrae: 'temperaturgivare',
    verkningsgard: 'verkningsgrad', verkninsgrad: 'verkningsgrad',
    återvininig: 'återvinning', återvinningn: 'återvinningen',
    återinning: 'återvinning', återvinnig: 'återvinning',
    frysskyddsgviare: 'frysskyddsgivare', fryskydd: 'frysskydd',
    cirkulationspmp: 'cirkulationspump', cirkulationspum: 'cirkulationspump',
    börväde: 'börvärde', börvärd: 'börvärde', börvarde: 'börvärde',
    inställningsväde: 'inställningsvärde', inställnigsvärde: 'inställningsvärde',
    fördröjnig: 'fördröjning', fördröjing: 'fördröjning',
    servicomkopplare: 'serviceomkopplare', serviceomkoplare: 'serviceomkopplare',
    larmgränns: 'larmgräns', larmgrännsen: 'larmgränsen'
  };
  // Keep this dictionary explicit: avoid guessing corrections from all words in
  // the framework, which can make valid technical language look misspelled.
  function scan(pages, alarms = [], categories = {}) {
    const findings = [];
    const add = (type, page, line, actual, suggestion, explanation, id) => findings.push({ id, type, page, line, actual, suggestion, explanation, decision:'pending' });
    for (const page of pages) {
      page.lines.forEach((line, index) => {
        const words = [...line.text.matchAll(/[\p{L}]+/gu)];
        for (const [position, word] of words.entries()) {
          const actual = word[0], lower = actual.toLocaleLowerCase('sv-SE');
          // Do not split component IDs or underscored signal names into words.
          const before = line.text[word.index-1] ?? '', after = line.text[word.index+actual.length] ?? '';
          if (/[\d_]/.test(before+after)) continue;
          if (spellings[lower]) {
            const corrected = spellings[lower];
            const suggestion = actual === actual.toUpperCase() ? corrected.toUpperCase() : actual[0] === actual[0].toUpperCase() ? corrected[0].toUpperCase()+corrected.slice(1) : corrected;
            add('Stavning', page.number, line, actual, suggestion, 'Möjligt stavfel – jämför med PDF-sidan.', `${page.number}:${index}:${position}:spell`);
          }
          const previous = words[position-1];
          if (!previous || actual.length < 2 || /[\d_]/.test(line.text[previous.index-1] ?? '')) continue;
          const gap = line.text.slice(previous.index+previous[0].length,word.index);
          if (/^ +$/.test(gap) && previous[0].toLocaleLowerCase('sv-SE') === lower) {
            add('Upprepat ord',page.number,line,previous[0]+gap+actual,previous[0],'Samma ord står två gånger i följd. Kontrollera att det inte beror på PDF-textens placering.',`${page.number}:${index}:${position}:repeat`);
          }
        }
      });
    }
    const unused = new Set(['28','34','35','36','37','39','44','47','48','49','59','67','68','69']);
    for (const [index,alarm] of alarms.entries()) {
      if (!alarm.priority || !alarm.category) continue; // Existing alarm view shows incomplete extraction.
      if (unused.has(alarm.category)) add('Larmkategori',alarm.page,alarm.line,alarm.tag+' · '+alarm.priority+' · '+alarm.category,'Välj en kategori som används','Kategorin är markerad Används ej i ramverket. Tolkningen av PDF-raden behöver bekräftas.',`alarm:${index}:unused`);
      else if (!categories[alarm.category]) add('Larmkategori',alarm.page,alarm.line,alarm.tag+' · '+alarm.category,'Kontrollera kategorinumret','Kategorinumret saknas i regelunderlaget.',`alarm:${index}:unknown`);
      else if (/^[123]\d$/.test(alarm.category)) {
        const expected = {1:'A',2:'B',3:'C'}[alarm.category[0]];
        if (alarm.priority !== expected) add('Larmklass',alarm.page,alarm.line,alarm.tag+' · '+alarm.priority+' · '+alarm.category,expected+' · '+alarm.category+' '+categories[alarm.category],'Klass och kategori verkar inte stämma ihop. Kontrollera att PDF-kolumnerna har lästs rätt.',`alarm:${index}:class`);
      }
    }
    return findings;
  }
  window.ECO_PDF_TEXT_CHECK = { scan };
})();

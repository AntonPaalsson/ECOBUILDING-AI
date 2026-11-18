(() => {
  // Deliberately limited to known spelling variants. Unknown words (school
  // names, products and component IDs) are never errors just for being unknown.
  const spellings = {
    humkunskap: 'hemkunskap',
    griftskåp: 'giftskåp', fläken: 'fläkten', tidschma: 'tidsschema',
    vartalsregleringen: 'varvtalsregleringen', vartalsreglering: 'varvtalsreglering',
    kontinuerligdrift: 'kontinuerlig drift',
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
    const singleSystem = '(?:LB|TA|FA|UC|VPU|VS|VP|VV|KV|KB|MV)\\d{1,3}';
    const systemName = singleSystem+'(?:_'+singleSystem+')*';
    const masterPattern = new RegExp('\\bSYSTEM\\s*:?\\s*(?:\\d{3,6}\\s*[-–—_]\\s*)?('+systemName+')\\b','gi');
    const mastersByPage = new Map(pages.map(page=>{
      const names = page.lines.flatMap((line,index)=>{
        // Some PDFs put the SYSTEM label and its value on separate lines.
        const text = /^\s*SYSTEM\s*:?\s*$/i.test(line.text) ? line.text+' '+(page.lines[index+1]?.text??'') : line.text;
        return [...text.matchAll(masterPattern)].map(match=>match[1].toUpperCase());
      });
      return [page.number,[...new Set(names)]];
    }));
    const documentMasters = [...new Set([...mastersByPage.values()].flat())];
    const titlePattern = new RegExp('(^|\\t)\\s*('+systemName+')\\s*([-–—:])\\s*([\\p{L}][\\p{L} /()]+)(?=\\t|$)','giu');
    for (const page of pages) {
      const localMasters=mastersByPage.get(page.number);
      const master=localMasters.length===1?localMasters[0]:localMasters.length===0&&documentMasters.length===1?documentMasters[0]:null;
      const masterMembers=master?master.split('_'):[];
      page.lines.forEach((line, index) => {
        if(master)for(const match of line.text.matchAll(titlePattern)) {
          const actual=match[2].toUpperCase();
          if(actual!==master) add('Fel systemnamn i rubrik',page.number,line,match[0].trim(),master+' '+match[3]+' '+match[4].trim(),'Driftkortets SYSTEM anger '+master+', men rubriken anger '+actual+'. Kontrollera och rätta rubrikens systemnamn.',`${page.number}:${index}:${match.index}:system-title`);
        }
        if(master) {
          const start=line.text.match(new RegExp('^\\s*Start\\s*/\\s*Stopp\\s+('+systemName+')\\b','i'));
          if(start&&!masterMembers.includes(start[1].toUpperCase())&&start[1].toUpperCase()!==master) {
            const actual=start[1].toUpperCase(),candidates=masterMembers.filter(name=>actual.startsWith(name)||name.startsWith(actual));
            add('Avvikande systembeteckning',page.number,line,start[1],candidates.length===1?candidates[0]:masterMembers.join(' eller '),'Rubriken Start/Stopp ska avse ett system som ingår i SYSTEM '+master+'. Kontrollera systembeteckningen.',`${page.number}:${index}:start-system`);
          }
        }
        const tagPattern=/(?<![\p{L}\d_])(?:[A-Z]+\d+(?:_[A-Z]+\d+)*[-_])?(?:TF|FF|GT|GF|GP|GQ|GX|GN|GM|SV|ST|SO|SN|LV|MS|P)\d*(?:_[A-ZÅÄÖ0-9]+)+/giu;
        for(const tag of line.text.matchAll(tagPattern)) {
          const suffix=tag[0].match(/_(SL|DS|HM|GF|TL|LL|HL)_(\1)(?=_|$)/i);
          if(suffix)add('Upprepat taggsuffix',page.number,line,tag[0],tag[0].replace(suffix[0],'_'+suffix[1]),'Samma funktionssuffix förekommer två gånger i följd. Kontrollera larmtaggen.',`${page.number}:${index}:${tag.index}:suffix`);
        }
        for(const placeholder of line.text.matchAll(/\bplan\s+([xX]\d*|\d*[xX]+)\b/g))add('Ofullständig placering',page.number,line,placeholder[0],'Ange rätt våningsplan','Placeringen innehåller en platshållare i stället för ett färdigt våningsplan.',`${page.number}:${index}:${placeholder.index}:floor`);
        // Only flag the cabinet when this same document contains an AS variant
        // with the identical identifier. Never invent a cabinet from its prefix.
        const cabinet=line.text.match(/\bApparatskåp\s*:\s*(AL[_-][A-Z0-9]+)/i);
        if(cabinet) {
          const id=cabinet[1].slice(3),expected=new RegExp('\\bAS[_-]'+id+'\\b','i');
          if(pages.some(p=>p.lines.some(l=>expected.test(l.text))))add('Avvikande apparatskåp',page.number,line,cabinet[1],'AS_'+id,'Samma skåpbeteckning förekommer med AS i dokumentet. Kontrollera om AL är felskrivet.',`${page.number}:${index}:cabinet`);
        }
        // Placeholder letters belong in the framework, not in a finished DK.
        // Check each component within serial names and signal names as well.
        const componentPattern = /(?<![\p{L}\d])(?:TF|FF|GT|GF|GP|GQ|GX|GN|GM|SV|ST|SO|SN|LV|P)(?:\d*[XYPN]+|\d+[XYPN]+\d*)(?=$|[^\p{L}\d])/giu;
        for (const match of line.text.matchAll(componentPattern)) {
          add('Ofullständigt komponentnamn',page.number,line,match[0],'Ange fullständig komponentbeteckning enligt driftkortet','Komponentnamnet innehåller platshållare. Ersätt dem med rätt löpnummer, exempelvis ST731 i stället för ST7P.',`${page.number}:${index}:${match.index}:component`);
        }
        const words = [...line.text.matchAll(/[\p{L}]+/gu)];
        for (const [position, word] of words.entries()) {
          const actual = word[0], lower = actual.toLocaleLowerCase('sv-SE');
          // Do not split component IDs or underscored signal names into words.
          const before = line.text[word.index-1] ?? '', after = line.text[word.index+actual.length] ?? '';
          if (/[\d_]/.test(before+after)) continue;
          if (spellings[lower]) {
            const corrected = spellings[lower];
            const suggestion = actual === actual.toUpperCase() ? corrected.toUpperCase() : actual[0] === actual[0].toUpperCase() ? corrected[0].toUpperCase()+corrected.slice(1) : corrected;
            add('Stavning', page.number, line, actual, suggestion, 'Möjligt stavfel: jämför med PDF sidan.', `${page.number}:${index}:${position}:spell`);
          }
          const previous = words[position-1];
          if (!previous || actual.length < 2 || /[\d_]/.test(line.text[previous.index-1] ?? '')) continue;
          const gap = line.text.slice(previous.index+previous[0].length,word.index);
          if (/^ +$/.test(gap) && previous[0].toLocaleLowerCase('sv-SE') === lower) {
            add('Upprepat ord',page.number,line,previous[0]+gap+actual,previous[0],'Samma ord står två gånger i följd. Kontrollera att det inte beror på PDF textens placering.',`${page.number}:${index}:${position}:repeat`);
          }
        }
      });
    }
    const unused = new Set(['28','34','35','36','37','39','44','47','48','49','59','67','68','69']);
    for (const [index,alarm] of alarms.entries()) {
      if (!alarm.priority || !alarm.category) continue; // Existing alarm view shows incomplete extraction.
      if (unused.has(alarm.category)) add('Larmkategori',alarm.page,alarm.line,alarm.tag+' · '+alarm.priority+' · '+alarm.category,'Välj en kategori som används','Kategorin är markerad Används ej i ramverket. Tolkningen av PDF raden behöver bekräftas.',`alarm:${index}:unused`);
      else if (!categories[alarm.category]) add('Larmkategori',alarm.page,alarm.line,alarm.tag+' · '+alarm.category,'Kontrollera kategorinumret','Kategorinumret saknas i regelunderlaget.',`alarm:${index}:unknown`);
      else if (/^[123]\d$/.test(alarm.category)) {
        const expected = {1:'A',2:'B',3:'C'}[alarm.category[0]];
        if (alarm.priority !== expected) add('Larmklass',alarm.page,alarm.line,alarm.tag+' · '+alarm.priority+' · '+alarm.category,expected+' · '+alarm.category+' '+categories[alarm.category],'Klass och kategori verkar inte stämma ihop. Kontrollera att PDF kolumnerna har lästs rätt.',`alarm:${index}:class`);
      }
    }
    return findings;
  }
  window.ECO_PDF_TEXT_CHECK = { scan };
})();

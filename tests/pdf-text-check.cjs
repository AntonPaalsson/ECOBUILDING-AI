const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const context = { window:{} }; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../pdf-text-check.js'),'utf8'),context);
const scan = context.window.ECO_PDF_TEXT_CHECK.scan;
const line = text => ({text,items:[],y:10});
const pages = [{number:1,lines:[line('Rökdetekering och Expantionskärl'),line('Fläkten ska ska starta.'),line('TF1_DS_L SOFIASKOLAN Kieback & Peter'),line('Handmanövrer kontrolleras.'),line('Ventilation\tVentilation')]}];
const results = scan(pages);
assert.equal(results.filter(r=>r.type==='Stavning').length,2);
assert.equal(results.filter(r=>r.type==='Upprepat ord').length,1);
assert.ok(results.some(r=>r.suggestion==='Rökdetektering'));
assert.equal(results.every(r=>r.page===1 && r.line.text),true);
const alarms = [{tag:'TF1_HM_L',priority:'B',category:'38',page:2,line:line('TF1_HM_L B 38')},{tag:'TF1_L',priority:'C',category:'34',page:2,line:line('TF1_L C 34')},{tag:'FF1_DS_L',priority:'B',category:'21',page:2,line:line('FF1_DS_L B 21')}];
const alarmResults = scan([],alarms,{'38':'Handmanöver','21':'Ventilation'});
assert.equal(alarmResults.length,2);
assert.ok(alarmResults.some(r=>r.type==='Larmklass' && r.suggestion.startsWith('C')));
assert.ok(alarmResults.some(r=>r.explanation.includes('Används ej')));
assert.equal(scan([{number:1,lines:[]}]).length,0);
const systemFindings=scan([{number:1,lines:[line('LB23 - FRÅNLUFTSFLÄKT'),line('SYSTEM 1180-FA31'),line('FA31-FF1'),line('Vid signal från LB23 startar FA31.')] }]);
assert.equal(systemFindings.length,1);
assert.equal(systemFindings[0].type,'Fel systemnamn i rubrik');
assert.equal(systemFindings[0].suggestion,'FA31 - FRÅNLUFTSFLÄKT');
assert.equal(scan([{number:1,lines:[line('FA31 – FRÅNLUFTSFLÄKT'),line('SYSTEM'),line('1180-FA31')]}]).length,0);
assert.equal(scan([{number:1,lines:[line('LB23 - FRÅNLUFTSFLÄKT')]}]).length,0);
assert.equal(scan([{number:1,lines:[line('SYSTEM 1180-LB23'),line('LB23 - LUFTBEHANDLING')]},{number:2,lines:[line('SYSTEM 1180-FA31'),line('FA31 - FRÅNLUFTSFLÄKT')]}]).length,0);
assert.equal(scan([{number:1,lines:[line('SYSTEM 1180-FA31')]},{number:2,lines:[line('LB23 - FRÅNLUFTSFLÄKT')]}]).filter(f=>f.type==='Fel systemnamn i rubrik').length,1);
assert.equal(scan([{number:1,lines:[line('SYSTEM 1180-FA31'),line('SYSTEM 1180-LB23'),line('UC01 - UNDERCENTRAL')]}]).length,0);
console.log('PASS: known spelling variants, repeated words, valid technical names, columns and alarm classes.');
const example=[
  'FA11_FA12 - FLÄKTRUM','SYSTEM 1180-FA11_FA12','ST1X','SN1x',
  'Placering: FA11_FA12-FF1 Taket, plan x00 hus A.',
  'Betjänar: DRAGSKÅP/GRIFTSKÅP','Apparatskåp: AL_A607','AS-A607',
  'Utlöst rökdetektor GX73 stoppar fläken.', 'Start/Stopp FA112',
  'Frånluftsfläkt FA11 styrs via tidschma. Vartalsregleringen styrs ej via DUC/PLC.',
  'Start/Stopp FA12','Frånluftsfläkt FA12 är i kontinuerligdrift.',
  'FA11-FF1_SL_SL A 11','Se 1180-DK-LB11.'
];
const expanded=scan([{number:1,lines:example.map(line)}]);
for(const actual of ['ST1X','SN1x','plan x00','GRIFTSKÅP','AL_A607','fläken','FA112','tidschma','Vartalsregleringen','kontinuerligdrift','FA11-FF1_SL_SL'])assert.ok(expanded.some(f=>f.actual===actual),actual);
assert.equal(expanded.find(f=>f.actual==='FA112').suggestion,'FA11');
assert.equal(expanded.find(f=>f.actual==='FA11-FF1_SL_SL').suggestion,'FA11-FF1_SL');
assert.equal(expanded.some(f=>f.type==='Fel systemnamn i rubrik'),false);
assert.equal(scan([{number:1,lines:['SYSTEM 1180-FA11_FA12','Start/Stopp FA11','Start/Stopp FA12','FA11-FF1_DS_L','Apparatskåp: AL_A607','Se 1180-DK-LB11.'].map(line)}]).length,0);
console.log('PASS: grouped systems, supplied spelling errors, repeated alarm suffix, cabinet evidence and floor placeholders.');

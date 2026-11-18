# Integrationsverktyg

Lokal webapp för granskning av BACnet-tagglistor och skapande av EBO ObjectSet-exporter. Excel-filer behandlas i webbläsaren och originalarbetsboken ändras inte.

## Starta

Öppna `index.html` i en modern Chromium-baserad webbläsare. Indata är en `.xlsx`-arbetsbok med kolumnerna `Name` och `Description`.

## Projektstruktur

- `index.html` och `app.js` – gränssnitt, tagggranskning och XML-export.
- `assets/app.css` – dark mode, layout och typografi.
- `assets/init-logo.svg` – Init-logotyp.
- `assets/fonts/` – Outfit-typsnitt och licens.
- `assets/components/` – källbiblioteket för TGML-komponenter, speglat från komponentbibliotekets kategorimappar.
- `data/framework-data.js` och `data/framework-system-tags.js` – ramverkets taggar och systemindelning.
- `data/air-treatment-tags.js` – luftbehandlingsregler.
- `data/lbxx-objectset-template.js` – LBXX ObjectSet-mall inläst av appen.
- `templates/tgml/LBXX_MALL.xml` – samma LBXX-mall, tillgänglig för inspektion i gränssnittet.
- `data/faxx-objectset-template.js` och `templates/faxx/objectset.xml` – FAXX-mall.
- `data/component-library.js` – komponentkatalog med TGML-innehåll och verifierad ObjectSet-bindningsmetadata där sådan finns.
- `vendor/` – JSZip och licensfil.
- `examples/` – exempelmaterial, inte nödvändigt för appens körning.

Komponentkatalogen byggs från de TGML-komponentfiler som finns i `assets/components/`. Poster utan verifierade ObjectSet-definitioner visas i katalogen men exporteras inte som nya komponenter.

## UI-utveckling

Gränssnittet använder Tailwind CSS 4 och daisyUI 5 med temat `init`.
Redigera `styles/app.css` och kör:

```sh
npm ci
npm run build:css
```

`assets/app.css` är den kompilerade filen som levereras med appen. Sidan behöver ingen CDN eller Node-server vid användning. `npm run watch:css` bygger om vid ändringar.

Webbläsarkontroller (kräver installerad Microsoft Edge):

```sh
node tests/ui-smoke.cjs
node tests/review-smoke.cjs
```

## Fullständig Integration med driftkort

FI börjar med uppladdning av flera driftkort i PDF-format. Därefter visas ett redigerbart systemträd med relationerna fastighet/skola → DUC → system → komponenter och larm. Varje läst uppgift har dokument- och sidreferenser. Fynden kommer från PDF-text, inte från verifierad tolkning av grafiska symboler; skannade sidor behöver kompletteras manuellt. Användaren bekräftar varje system och kan välja bort fynd eller lägga till komponenter.

Efter tagglistans import visas en mappningssida: komponenter i båda underlagen, DK-komponenter utan taggar och komponenter som bara finns i tagglistan. Ett DK-system kan uttryckligen kopplas till ett annat taggprefix. Bekräftade DK-komponenter aktiverar relevanta komponentavsnitt även när komponentens taggar saknas helt; oanvända DK-komponentavsnitt föreslås inte. Köksvillkor och övriga befintliga regler tillämpas också. Granskningen bedömer fortfarande om en befintlig tagg finns i ramverket oberoende av om komponenten valts i DK.

Valda PDF-larm överförs till den befintliga DK-kontrollen, som kontrollerar taggförekomst samt klass/kategori. Efter projektuppgifter och granskning följer XML-exporten. Varje system kan ha en egen DUC; både BACnet-referenser och bildens DUC-egenskap använder systemets DUC före det gemensamma reservvärdet. Det går att välja **Fortsätt utan driftkort** för att använda det tidigare manuella flödet.

```sh
node tests/fi-driftkort-core.cjs
node tests/fi-flow.cjs
node tests/fi-pdf-smoke.cjs "C:/sökväg/driftkort.pdf"
```

## PDF-test av driftkort

Välj **PDF-test · Driftkort** i snabbmenyn. Funktionen behandlar PDF-filen lokalt och visar PDF-sidor, komponentbeteckningar från textlagret och preliminära larmrader med sidreferenser. Komponentfynd kan bekräftas och larmförslagens tagg, klass och kategori kan korrigeras före kopiering till Excel. Testet ändrar inte tagglistan, DK-kontrollen eller XML-exporten.

Textträffar bevisar inte att en symbol eller fysisk komponent finns i schemat. Skannade sidor och symboler utan läsbara beteckningar kräver OCR/bildtolkning, vilket inte ingår i denna första testversion. Läs gärna textunderlaget och jämför med PDF-förhandsvisningen.

Fliken **Textkontroll** letar efter en begränsad uppsättning vanliga svenska fackstavfel, dubbla ord i samma textrad och misstänkta kombinationer av larmklass/kategori. Varje förslag har sidreferens, textunderlag och val för att bekräfta eller avfärda fyndet. Resultaten kan kopieras till Excel; PDF-filen ändras inte. Detta är en regelbaserad hjälp, inte ett fullständigt stavningslexikon eller en teknisk funktionskontroll. Test av reglerna: `node tests/pdf-text-check.cjs`.

PDF.js och dess resurser ligger lokalt i `vendor/pdfjs/`, inklusive licens. Vid uppdatering av PDF.js byggs webbläsarfilerna med `npm run build:pdf`. HTTP använder en worker; öppning via `file:` använder PDF.js fallback i samma process.

Testa med ett lokalt, textbaserat driftkort utan att kopiera det till projektet:

```sh
node tests/pdf-smoke.cjs "C:/sökväg/driftkort.pdf"
```

## Modbus integration – testfunktion

Välj **Modbus integration** i snabbmenyn och ladda upp en registerlista i samma format som IV Produkt-exemplet (Description, Adress, Type, Remarks). Systemnamnet hämtas från källans metadata och kan ändras. Punkten får ett unikt föreslaget namn från system, beskrivning och registeradress; detta är inte en automatisk mappning till SISAB-taggbeteckningar.

Förhandsgranskningen låter användaren välja punkter och ändra namn, punkttyp, registertyp och funktionskoder. Adressdelen efter `0x/1x/3x/4x` läses som decimalt registertal; områdesprefixet är inte en hexadecimalsiffra. Registernumret behålls som standard, med val att dra av 1. `factor 10` tolkas som Gain 0,1 som standard; skalningsriktning kan ändras. Note 1 får enhet där sådan kan läsas ut, och Note 2 behåller Remarks.

Exporten klonar motsvarande punkttypsrad i `templates/modbus/Modbusmall.xlsx` och bevarar 15 kolumner utan rubrikrad. Poll interval, Value, Bit mask och Validation behåller mallradens standardvärden. 32-bitars Output får skrivfunktion 16. Dubbla registeradresser visas för kontroll; källadresser rättas inte automatiskt. Ord-/byteordning och faktisk kommunikation med enheten behöver verifieras i EBO.

Vid byte av Excel-mall: ersätt filen i `templates/modbus/` och kör `npm run build:modbus-template`. Bundlen gör att appen även kan läsa mallen via lokal `file:`-URL.

```sh
node tests/modbus-smoke.cjs "C:/sökväg/registerlista.xlsx"
```

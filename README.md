# ECOBUILDING · Tagglista

Lokal webapp för att korrigera `Name` i en Excel-tagglista och granska taggar mot BACnet-ramverket. Vanliga taggar får beteckningen före första mellanslaget som `Name`. Larmklasser behåller hela sitt `Description`-namn. Metadata och projektvärden får `Name` lika med `Description`, läggs i en egen kategori och matchas inte mot ramverket. Detta omfattar `Anvisning`, `Def.-data`, `Framsteg`, `IPLinkKonfig`, `Område`, `Projektering`, `Restsminne`, `Tillstånd` samt `actValue`- och `BACInfo`-egenskaper. Taggarna `SN11`–`SN14` matchas mot ramverkets löpnummermall `SN1x`.

## Visuell profil

Frontendens typografi och färger följer Word-mallarna: Arial som brödtext, Arial Black för rubriker och grönt (`#52AE32`) med orange (`#EF7D00`) som accent. Outfit används där det finns installerat och faller annars tillbaka till Arial.

## Starta

Öppna `index.html` i en modern Chromium-baserad webbläsare. Filer behandlas lokalt. Indata ska vara en `.xlsx`-arbetsbok där första bladet har rubrikerna `Name` och `Description`.

## Struktur

- `index.html` – sidans struktur
- `assets/app.css` – layout, typsnitt och färger
- `assets/init-logo.svg` – Init-symbol med orange punkter i sidhuvudet
- `assets/init-wave-dark.jpg` – statisk mörk vågbakgrund för sidan
- `app.js` – inläsning, jämförelse och Excel-export
- `data/framework-data.js` – taggar och larmklasser från ramverket
- `data/lb11-svg-template.js` – SVG-förlaga som appen filtrerar mot uppladdade taggar
- `templates/tgml/LB11_BILD.xml` – TGML-mall extraherad från objektet `LB11 BILD`
- `templates/tgml/LB11_BILD-preview.svg` – grafisk förhandsvisning av TGML-mallen
- `templates/tgml/build_preview.py` – bygger SVG-förhandsvisningen från TGML-källan
- `vendor/` – JSZip och licensfil
- `examples/LB11 MALL.xml` – XML-exempel som inte används av Excelgranskningen

Exporten laddas ner som `_granskad.xlsx`. Grön betyder träff, gul betyder möjlig stavningsavvikelse och röd betyder att appen inte hittar en träff. Gul/röd status är en automatisk bedömning som kan behöva kontrolleras manuellt.





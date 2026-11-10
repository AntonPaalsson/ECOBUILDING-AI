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

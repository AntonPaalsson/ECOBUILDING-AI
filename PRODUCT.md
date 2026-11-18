# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Building automation engineers reviewing project documents and tag lists before EBO integration. This primary audience and task were confirmed by the project owner.

## Product Purpose

Integrationsverktyg helps engineers review building automation source material, identify discrepancies, and prepare integration exports. Success means producing reviewed integration data while retaining the ability to check findings against the source documents.

## Operating Context

The existing application is a Swedish browser tool built with static HTML and JavaScript, Tailwind CSS 4, and daisyUI 5. It can be opened locally in a modern Chromium-based browser. Engineers work with Excel tag lists, PDF driftkort, BACnet objects, EBO ObjectSet XML, and Modbus register lists.

The full integration workflow combines driftkort upload, review of extracted systems and components, tag-list mapping, project information, review, and XML export. Standalone tag-list, IO, driftkort, and Modbus tools also exist.

## Capabilities and Constraints

- Preserve the Swedish interface and domain terminology.
- Process imported files locally in the browser and leave original files unchanged.
- Preserve human verification of PDF findings. Text extraction does not establish that a graphical symbol or physical component exists; scanned pages and symbols without readable text require manual supplementation in the current implementation.
- Review BACnet tag lists against the existing framework and generate EBO ObjectSet exports.
- Provide source document and page references for extracted driftkort findings where available.
- Keep the current Modbus workflow's test status and explicit review of naming, addressing, scaling, and communication assumptions.

The functional description above is grounded in README.md and the current implementation; the owner confirmed the audience and preservation requirements during initialization.

## Brand Commitments

Preserve the existing Init identity, including the Init logo asset at `assets/init-logo.svg`. Product-facing interface copy is Swedish. No replacement visual direction was requested during initialization.

## Evidence on Hand

- `README.md`: documented workflows, limitations, local operation, and verification commands.
- `index.html` and the application JavaScript modules: current interface and functionality.
- `data/`: framework tags, system definitions, component metadata, and export templates.
- `templates/`: existing ObjectSet and Modbus templates.
- `assets/components/`: existing TGML component library.
- `examples/` and `tests/`: example material and verification fixtures; these do not establish customer endorsements or performance claims.

## Product Principles

1. Support engineering review before export; distinguish extracted proposals from confirmed information.
2. Preserve source files and local processing.
3. Keep findings traceable to available source evidence.
4. Preserve Swedish terminology and the Init identity.

## Open Decisions

No additional accessibility standard, deployment target, or secondary audience was specified during initialization. Do not infer these as confirmed requirements.

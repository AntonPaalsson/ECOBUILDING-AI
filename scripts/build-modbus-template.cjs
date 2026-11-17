const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const bytes = fs.readFileSync(path.join(root, 'templates/modbus/Modbusmall.xlsx'));
fs.writeFileSync(path.join(root, 'data/modbus-template.js'), 'window.ECO_MODBUS_TEMPLATE_BASE64 = ' + JSON.stringify(bytes.toString('base64')) + ';\n');
console.log('Modbus template bundle built.');

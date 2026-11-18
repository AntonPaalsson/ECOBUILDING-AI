// Init SVG artwork supplied by the project owner. Original files: assets/icons/init/.
// Inline geometry keeps icons available when index.html is opened locally.
(() => {
  const shapes = {
  "upload": "<g>\n\t<polygon points=\"109,85 109,107.9 32.7,107.9 32.7,85 25,85 25,115.6 116.7,115.6 116.7,85 \t\"/>\n\t<polygon points=\"67,40.8 67,100.3 74.7,100.3 74.7,40.8 94.9,61 100.3,55.6 70.9,26.2 41.4,55.6 46.8,61 \t\"/>\n</g>",
  "download": "<g>\n\t<polygon points=\"109,86.1 109,109.1 32.7,109.1 32.7,86.1 25,86.1 25,116.7 116.7,116.7 116.7,86.1 \t\"/>\n\t<polygon points=\"100.3,69.7 94.9,64.3 74.7,84.5 74.7,25 67,25 67,84.5 46.8,64.3 41.4,69.7 70.9,99.2 \t\"/>\n</g>",
  "search": "<path class=\"cls-1\" d=\"M89.6,80c9.3-13.8,7.9-32.6-4.3-44.8-13.8-13.8-36.3-13.8-50.1,0-13.8,13.8-13.8,36.3,0,50.1,12.2,12.2,31.1,13.7,44.8,4.3l27.3,27.3,9.6-9.6-27.3-27.3ZM40.5,79.9c-10.9-10.8-10.9-28.5,0-39.4,10.8-10.8,28.5-10.8,39.4,0,10.8,10.8,10.8,28.5,0,39.4-10.9,10.9-28.5,10.9-39.4,0Z\"/>",
  "good": "<g>\n\t<path d=\"M70.9,25C45.6,25,25,45.6,25,70.9s20.6,45.8,45.8,45.8s45.8-20.6,45.8-45.8S96.1,25,70.9,25z M70.9,109\n\t\tc-21.1,0-38.2-17.1-38.2-38.2s17.1-38.2,38.2-38.2s38.2,17.1,38.2,38.2C109,91.9,91.9,109,70.9,109z\"/>\n\t<polygon points=\"63.2,80.7 50.6,68.2 45.2,73.6 63.2,91.5 96.5,58.3 91.1,52.9 \t\"/>\n</g>",
  "typo": "<path d=\"M70.9,36.8c3.1,0,6.2,2.1,8.6,6.2l27.1,47c4.7,8.2.9,14.9-8.6,14.9h-54.3c-9.5,0-13.3-6.7-8.6-14.9l27.1-47c2.4-4.1,5.5-6.2,8.6-6.2M70.9,29.2c-6,0-11.5,3.6-15.2,10l-27.1,47c-3.7,6.3-4,12.9-1,18.1,3,5.2,8.9,8.2,16.2,8.2h54.3c7.3,0,13.2-3,16.2-8.2,3-5.2,2.6-11.8-1-18.1l-27.1-47c-3.7-6.3-9.2-10-15.2-10h0Z\"/>\n  <path d=\"M74.2,94.2c.9-.9,1.3-2,1.3-3.3s-.4-2.4-1.3-3.4c-.9-.9-2-1.4-3.3-1.4s-2.4.5-3.3,1.4c-.9.9-1.3,2-1.3,3.4s.4,2.4,1.3,3.3c.9.9,2,1.4,3.3,1.4s2.4-.5,3.3-1.4M73.9,83.1l1.5-19.1h-9.1l1.5,19.1h6.2Z\"/>",
  "bad": "<g>\n\t<path d=\"M70.9,25C45.6,25,25,45.6,25,70.9s20.6,45.8,45.8,45.8s45.8-20.6,45.8-45.8S96.1,25,70.9,25z M70.9,109\n\t\tc-21.1,0-38.2-17.1-38.2-38.2s17.1-38.2,38.2-38.2s38.2,17.1,38.2,38.2C109,91.9,91.9,109,70.9,109z\"/>\n\t<polygon points=\"87.2,49.1 70.9,65.5 54.5,49.1 49.1,54.5 65.5,70.9 49.1,87.2 54.5,92.6 70.9,76.3 87.2,92.6 92.6,87.2 76.3,70.9 \n\t\t92.6,54.5 \t\"/>\n</g>",
  "included": "<g>\n\t<path d=\"M61.3,30.7H25v65.1c0,8.4,6.9,15.3,15.3,15.3h61.2c8.4,0,15.3-6.9,15.3-15.3V46H72.7L61.3,30.7z M109.1,95.7\n\t\tc0,4.2-3.4,7.7-7.7,7.7H40.3c-4.2,0-7.7-3.4-7.7-7.7V38.3h24.9l11.4,15.3h40.3L109.1,95.7L109.1,95.7z\"/>\n\t<rect x=\"70.9\" y=\"30.7\" width=\"45.9\" height=\"7.6\"/>\n</g>"
};
  function create(name) {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 141.7 141.7');
    icon.setAttribute('class', 'init-icon');
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('focusable', 'false');
    icon.innerHTML = shapes[name] || '';
    return icon;
  }
  window.ECO_ICONS = { create };
  for (const id of ['fiDkPick', 'pick', 'ioPick', 'pdfPick', 'modbusPick']) {
    document.getElementById(id)?.prepend(create('upload'));
  }
  for (const id of ['download', 'downloadEboXml', 'pdfExportReview', 'modbusExport']) {
    document.getElementById(id)?.prepend(create('download'));
  }
  for (const button of document.querySelectorAll('[data-review-filter]')) {
    button.querySelector('span')?.prepend(create(button.dataset.reviewFilter));
  }
  for (const input of document.querySelectorAll('input[type="search"]')) {
    const label = input.closest('label');
    if (!label) continue;
    const text = [...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
    if (!text) continue;
    const caption = document.createElement('span');
    caption.className = 'init-icon-label';
    text.before(caption);
    caption.append(create('search'), text);
  }
})();

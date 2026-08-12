(function () {
  let modalEl = null;
  let currentLibrary = null;
  let notSendingModalEl = null;

  const numWords = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
    eighteen: 18, nineteen: 19, twenty: 20,
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
    eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16,
    seventeenth: 17, eighteenth: 18, nineteenth: 19, twentieth: 20
  };

  function wordToNum(w) {
    const lc = w.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(numWords, lc)) return numWords[lc];
    const m = lc.match(/^(\d+)(?:st|nd|rd|th)?$/);
    return m ? parseInt(m[1], 10) : null;
  }

  function detectFormat(scope) {
    const root = scope || document;
    const bs = root.querySelectorAll ? root.querySelectorAll('b') : [];
    for (const b of bs) {
      const txt = b.textContent.trim();
      if (/\(DVD/i.test(txt) || /\(Blu-?ray/i.test(txt) || /\(VHS/i.test(txt)) return 'dvd';
      if (/\(.*Audiobook/i.test(txt) || /\(CD\s*Audio/i.test(txt)) return 'audio';
      if (/\(Large\s*Print/i.test(txt)) return 'largeprint';
    }
    return 'book';
  }

  function cleanTitle(raw, format) {
    if (!raw) return '';
    let t = raw.split('/')[0].split(';')[0].trim();
    t = t.replace(/[.,:;\s]+$/, '');
    t = t.replace(/\s*\((?:Large\s*Print|DVD(?:\s+Video)?|CD(?:\s+Audiobook)?|Audiobook|Blu-?ray|VHS|Book(?:\s+\d+)?)\)\s*/gi, ' ')
      .replace(/\s{2,}/g, ' ').trim();
    t = t.replace(/\s+by\s+.+$/i, '').trim();
    if (format === 'dvd') {
      const colonIdx = t.indexOf(' : ');
      if (colonIdx > 0) t = t.slice(0, colonIdx).trim();
    }
    t = t.replace(/\s*\b(?:seasons?|series|books?|vol(?:ume)?s?)\s+([\w-]+(?:\s+(?:and|to|-)\s+[\w-]+)?)/gi, (match, nums) => {
      const parts = nums.split(/\s+(?:and|to|-)\s+/);
      const converted = parts.map(p => wordToNum(p)).filter(n => n !== null);
      return converted.length > 0 ? ' ' + converted.join(' ') : match;
    }).replace(/\s*\b(?:the\s+)?(?:complete\s+)?([\w-]+)\s+(?:seasons?|series|books?|vol(?:ume)?s?)\b/gi, (match, num) => {
      const n = wordToNum(num);
      return n !== null ? ' ' + n : match;
    }).replace(/\s{2,}/g, ' ').trim();
    if (format === 'dvd') {
      const m = t.match(/^(.+?)\s+[A-Z]{2,}/);
      if (m) t = m[1].trim();
      t = t.replace(/\s+(?:presents|directed by|produced by|written by|starring|featuring|distributed by).*$/i, '').trim();
    }
    return t.replace(/[.,:;\s]+$/, '').trim();
  }

  function buildSearchUrl(title, format) {
    const filter = { dvd: 'qm102', audio: 'qm104', largeprint: 'qp131' }[format] || '';
    return `https://waverlyiapl.booksys.net/opac/wpl/index.html#/search/criteria/srd0kc${encodeURIComponent(title)}${filter}UU${crypto.randomUUID()}Xc1a0d0r0p0s0-t0-v0-h0-m0`;
  }

  function titleText(entry) {
    return typeof entry === 'string' ? entry : (entry.title || '');
  }

  function titleCallNumber(entry) {
    return typeof entry === 'string' ? '' : (entry.callNumber || '');
  }

  function makeTitleEntry(title, callNumber) {
    return { title: title, callNumber: callNumber || '' };
  }

  function normalizeLibraries(libraries) {
    return libraries.map(lib => ({
      name: lib.name,
      titles: (lib.titles || []).map(t =>
        typeof t === 'string' ? makeTitleEntry(t) : makeTitleEntry(t.title, t.callNumber)
      )
    }));
  }

  function getLibraries() {
    const raw = localStorage.getItem('siloLibraryList');
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && (parsed.length === 0 || typeof parsed[0] === 'string')) {
        const migrated = parsed.map(name => ({ name, titles: [] }));
        saveLibraries(migrated);
        return migrated;
      }
      const normalized = normalizeLibraries(parsed);
      return normalized;
    } catch (e) {
      return [];
    }
  }

  function saveLibraries(libraries) {
    libraries.sort((a, b) => a.name.localeCompare(b.name));
    localStorage.setItem('siloLibraryList', JSON.stringify(libraries));
  }

  function libraryHasTitle(lib, title) {
    return lib.titles.some(t => titleText(t) === title);
  }

  function closeModal() {
    if (modalEl) {
      modalEl.remove();
      modalEl = null;
    }
  }

  function closeNotSendingModal() {
    if (notSendingModalEl) {
      notSendingModalEl.remove();
      notSendingModalEl = null;
    }
  }

  function addLibrary(libraryName) {
    if (!libraryName) return false;
    const libraries = getLibraries();
    currentLibrary = libraryName;
    const pageTitle = getPageTitle();
    let lib = libraries.find(l => l.name === libraryName);
    if (lib) {
      if (pageTitle && !libraryHasTitle(lib, pageTitle)) {
        lib.titles.push(makeTitleEntry(pageTitle));
      }
    } else if (libraries.length >= 20) {
      alert('Cannot store any more libraries. The list is full (20 max).');
      return false;
    } else {
      libraries.push({ name: libraryName, titles: pageTitle ? [makeTitleEntry(pageTitle)] : [] });
    }
    saveLibraries(libraries);
    return true;
  }

  function removeLibrary(name) {
    let libraries = getLibraries();
    libraries = libraries.filter(l => l.name !== name);
    saveLibraries(libraries);
    renderModal();
  }

  function clearList() {
    if (!confirm('Are you sure you want to clear the entire list?')) return;
    localStorage.removeItem('siloLibraryList');
    currentLibrary = null;
    const toLibrary = document.getElementById('id_to_library');
    if (toLibrary && typeof $ !== 'undefined' && $.fn.select2) {
      $('#id_to_library').val(null).trigger('change');
    }
    renderModal();
  }

  function manualAdd() {
    const libraryName = prompt('Enter the full name of the library to add:');
    if (!libraryName || libraryName.trim() === '') return;
    const itemTitle = prompt('Enter the name of the item to add:');
    const name = libraryName.trim();
    const title = itemTitle ? itemTitle.trim() : null;
    const libraries = getLibraries();
    let lib = libraries.find(l => l.name === name);
    if (lib) {
      if (title && !libraryHasTitle(lib, title)) {
        lib.titles.push(makeTitleEntry(title));
      }
    } else if (libraries.length >= 20) {
      alert('Cannot store any more libraries. The list is full (20 max).');
    } else {
      libraries.push({ name, titles: title ? [makeTitleEntry(title)] : [] });
    }
    saveLibraries(libraries);
    renderModal();
  }

  function setCallNumber(libraryName, titleIndex) {
    const libraries = getLibraries();
    const lib = libraries.find(l => l.name === libraryName);
    if (!lib || !lib.titles[titleIndex]) return;
    const entry = lib.titles[titleIndex];
    const current = titleCallNumber(entry);
    const promptLabel = current
      ? `Enter call number for "${titleText(entry)}":`
      : `Enter call number for "${titleText(entry)}":`;
    const value = prompt(promptLabel, current);
    if (value === null) return;
    entry.callNumber = value.trim();
    saveLibraries(libraries);
    renderModal();
  }

  function getPageTitle() {
    const els = document.getElementsByTagName('b');
    for (let i = 0; i < els.length; i++) {
      if (els[i].textContent.trim() === 'Title:') {
        const fmt = detectFormat(document);
        return cleanTitle(els[i].nextSibling.textContent, fmt) || null;
      }
    }
    return null;
  }

  function willSend() {
    const dateField = document.getElementById('id_responderlist-date_due');
    if (!dateField) {
      alert('Date field not found!');
      return;
    }
    const parts = dateField.value.split('/');
    if (parts.length !== 3) {
      alert('Invalid date format.');
      return;
    }
    const due = new Date(parseInt(parts[2], 10), parseInt(parts[0], 10) - 1, parseInt(parts[1], 10));
    due.setMonth(due.getMonth() + 1);
    const y = due.getFullYear();
    const m = due.getMonth() + 1;
    const d = due.getDate();
    dateField.value = (m < 10 ? '0' + m : m) + '/' + (d < 10 ? '0' + d : d) + '/' + y;
    const btn = document.querySelector('input[type="submit"][name="will_supply"]');
    if (btn) btn.click();
    else alert('"Will Supply" button not found!');
  }

  function markReturned() {
    const btn = document.querySelector('input[type="submit"][name="mark_returned"]');
    if (btn) btn.click();
    else alert('"Mark Returned" button not found!');
  }

  function checkoutSearch() {
    try {
      const form = document.querySelector('.responderTransactionForm');
      if (!form) {
        alert('Checkout search is only available on a transaction page.');
        return;
      }
      const text = form.innerText;
      const match = text.match(/Title:\s*(.*?)\s*\n/);
      if (!match) {
        alert('Could not find title.');
        return;
      }
      const fmt = detectFormat(form);
      const title = cleanTitle(match[1], fmt);
      window.open(buildSearchUrl(title, fmt), '_blank');
    } catch (e) {
      alert('Bookmarklet failed. Could not find the necessary page elements.');
    }
  }

  function submitNotSending(reasonId) {
    const select = document.getElementById('id_responderlist-reject_reason_id');
    if (!select) {
      alert('Reject reason field not found on this page.');
      return;
    }
    select.value = String(reasonId);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    closeNotSendingModal();
    const btn = document.querySelector('input[type="submit"][name="not_supplied"]');
    if (btn) btn.click();
    else alert('"Not Supplied" button not found!');
  }

  function showNotSendingModal() {
    closeNotSendingModal();
    notSendingModalEl = document.createElement('div');
    Object.assign(notSendingModalEl.style, {
      position: 'fixed', zIndex: '100000', left: '0', top: '0', width: '100%', height: '100%',
      overflow: 'auto', backgroundColor: 'rgba(0,0,0,0.5)'
    });
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      backgroundColor: '#fefefe', margin: '15% auto', padding: '20px', border: '1px solid #888',
      width: '80%', maxWidth: '400px', borderRadius: '8px', fontFamily: 'sans-serif', textAlign: 'center'
    });
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    Object.assign(closeBtn.style, {
      color: '#aaa', float: 'right', fontSize: '28px', fontWeight: 'bold', cursor: 'pointer'
    });
    closeBtn.onclick = closeNotSendingModal;
    const heading = document.createElement('h3');
    heading.innerText = 'Mark Not Sending';
    Object.assign(heading.style, { marginTop: '0' });
    const promptText = document.createElement('p');
    promptText.innerText = 'Choose a reason:';
    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' });

    function makeModalButton(label, bg, handler) {
      const btn = document.createElement('button');
      btn.innerText = label;
      btn.onclick = handler;
      Object.assign(btn.style, {
        padding: '10px 15px', cursor: 'pointer', border: 'none', borderRadius: '4px',
        color: 'white', backgroundColor: bg
      });
      return btn;
    }

    btnRow.appendChild(makeModalButton('Cannot Locate', '#dc3545', () => submitNotSending(7)));
    btnRow.appendChild(makeModalButton('Checked Out', '#fd7e14', () => submitNotSending(2)));
    panel.appendChild(closeBtn);
    panel.appendChild(heading);
    panel.appendChild(promptText);
    panel.appendChild(btnRow);
    notSendingModalEl.appendChild(panel);
    document.body.appendChild(notSendingModalEl);
    notSendingModalEl.onclick = (e) => { if (e.target === notSendingModalEl) closeNotSendingModal(); };
  }

  async function pasteList() {
    const libraries = getLibraries();
    if (libraries.length === 0) return alert('No libraries to paste. The list is empty.');
    if (libraries.some(l => l.name.includes('Tripoli'))) {
      alert('Nancy from Tripoli wants to pick these up herself. Do not send through van.');
    }
    const toLibrary = document.getElementById('id_to_library');
    if (!toLibrary) return alert('Could not find the target library field on this page.');
    if (typeof $ === 'undefined' || !$.fn.select2) {
      return alert('Could not interact with the library selection widget.');
    }
    const options = Array.from(toLibrary.options);
    const parenRe = /\(([^)]+)\)/;
    const matched = [];
    const unmatched = [];
    libraries.forEach(lib => {
      let opt = null;
      const paren = lib.name.match(parenRe);
      if (paren) opt = options.find(o => o.text.includes(paren[0]));
      if (!opt) opt = options.find(o => o.text.trim() === lib.name.trim());
      if (!opt) {
        const first = lib.name.split(',')[0].trim();
        if (first) opt = options.find(o => o.text.trim().startsWith(first));
      }
      if (opt) matched.push(opt.value);
      else unmatched.push(lib.name);
    });
    const current = $('#id_to_library').val() || [];
    $('#id_to_library').val([...new Set([...current, ...matched])]).trigger('change');
    await new Promise(r => setTimeout(r, 100));
    if (unmatched.length > 0) {
      $('#id_to_library').select2('open');
      const searchField = $('span.select2-container--open .select2-search__field');
      if (searchField.length === 0) {
        alert('Could not find the library search input field to type into.');
        $('#id_to_library').select2('close');
        return;
      }
      for (const name of unmatched) {
        searchField.val(name);
        searchField.trigger('input');
        await new Promise(r => setTimeout(r, 300));
        searchField[0].dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true
        }));
        await new Promise(r => setTimeout(r, 150));
      }
      $('#id_to_library').select2('close');
    }
    closeModal();
  }

  function printPullMailingList() {
    const libraries = getLibraries();
    if (libraries.length === 0) {
      alert('No libraries in the list to print.');
      return;
    }
    const rows = [];
    libraries.forEach(lib => {
      if (!lib.titles || lib.titles.length === 0) {
        rows.push({ library: lib.name, title: '(no items listed)', callNumber: '' });
        return;
      }
      lib.titles.forEach(t => {
        rows.push({ library: lib.name, title: titleText(t), callNumber: titleCallNumber(t) });
      });
    });
    const printedAt = new Date().toLocaleString();
    const pullRows = rows.map(r => `
      <tr>
        <td>${escapeHtml(r.callNumber || '—')}</td>
        <td>${escapeHtml(r.title)}</td>
        <td>${escapeHtml(r.library)}</td>
      </tr>`).join('');
    const mailingSections = libraries.map(lib => {
      const items = (lib.titles && lib.titles.length > 0)
        ? lib.titles.map(t => {
          const cn = titleCallNumber(t);
          const suffix = cn ? ` <span class="call">(${escapeHtml(cn)})</span>` : '';
          return `<li>${escapeHtml(titleText(t))}${suffix}</li>`;
        }).join('')
        : '<li><em>(no items listed)</em></li>';
      return `<div class="mail-block"><h3>${escapeHtml(lib.name)}</h3><ul>${items}</ul></div>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><title>ILL Pull & Mailing List</title>
<style>
  body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 20px; margin-bottom: 4px; }
  .meta { color: #555; margin-bottom: 20px; font-size: 13px; }
  h2 { font-size: 16px; margin: 24px 0 8px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 13px; }
  th { background: #f5f5f5; }
  .mail-block { margin-bottom: 16px; page-break-inside: avoid; }
  .mail-block h3 { margin: 0 0 6px; font-size: 14px; }
  .mail-block ul { margin: 0; padding-left: 20px; }
  .call { color: #555; }
  @media print { body { margin: 12px; } }
</style></head><body>
  <h1>ILL Pull List &amp; Mailing Reference</h1>
  <div class="meta">Printed ${escapeHtml(printedAt)}</div>
  <h2>Pull List</h2>
  <table>
    <thead><tr><th>Call #</th><th>Title</th><th>For Library</th></tr></thead>
    <tbody>${pullRows}</tbody>
  </table>
  <h2>Mailing Reference</h2>
  <p class="meta">Match printed labels to the library destinations below.</p>
  ${mailingSections}
</body></html>`;
    const win = window.open('', '_blank');
    if (!win) {
      alert('Pop-up blocked. Please allow pop-ups to print the list.');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function createModal() {
    closeModal();
    modalEl = document.createElement('div');
    Object.assign(modalEl.style, {
      position: 'fixed', zIndex: '99999', left: '0', top: '0', width: '100%', height: '100%',
      overflow: 'auto', backgroundColor: 'rgba(0,0,0,0.5)'
    });
    const panel = document.createElement('div');
    Object.assign(panel.style, {
      backgroundColor: '#fefefe', margin: '10% auto', padding: '20px', border: '1px solid #888',
      width: '80%', maxWidth: '500px', borderRadius: '8px', fontFamily: 'sans-serif'
    });
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    Object.assign(closeBtn.style, {
      color: '#aaa', float: 'right', fontSize: '28px', fontWeight: 'bold', cursor: 'pointer'
    });
    closeBtn.onclick = closeModal;
    const heading = document.createElement('h2');
    heading.innerText = 'Library List';
    Object.assign(heading.style, { marginTop: '0', paddingBottom: '10px', borderBottom: '1px solid #ccc' });
    const content = document.createElement('div');
    content.id = 'bookmarkletContentArea';
    panel.appendChild(closeBtn);
    panel.appendChild(heading);
    panel.appendChild(content);
    modalEl.appendChild(panel);
    document.body.appendChild(modalEl);
    modalEl.onclick = (e) => { if (e.target === modalEl) closeModal(); };
  }

  function makeButton(label, handler, styles) {
    const btn = document.createElement('button');
    btn.innerText = label;
    btn.onclick = handler;
    Object.assign(btn.style, {
      padding: '10px 15px', cursor: 'pointer', border: 'none', borderRadius: '4px', color: 'white'
    }, styles || {});
    return btn;
  }

  function renderModal() {
    const content = document.getElementById('bookmarkletContentArea');
    if (!content) return;
    content.innerHTML = '';
    const pageTitle = getPageTitle();
    if (pageTitle) {
      const titleEl = document.createElement('h4');
      titleEl.innerText = pageTitle;
      Object.assign(titleEl.style, { marginTop: '0', fontStyle: 'italic', color: '#333' });
      content.appendChild(titleEl);
    }
    const libraries = getLibraries();
    const listWrap = document.createElement('div');
    Object.assign(listWrap.style, { maxHeight: '300px', overflowY: 'auto', marginBottom: '15px' });
    if (libraries.length === 0) {
      listWrap.innerText = 'No libraries saved yet.';
    } else {
      const ul = document.createElement('ul');
      Object.assign(ul.style, { listStyle: 'none', padding: '0', margin: '0' });
      libraries.forEach(lib => {
        const li = document.createElement('li');
        Object.assign(li.style, {
          padding: '8px', borderBottom: '1px solid #eee', display: 'flex',
          flexDirection: 'column', alignItems: 'flex-start'
        });
        if (lib.name === currentLibrary) li.style.backgroundColor = '#d4edda';
        const header = document.createElement('div');
        Object.assign(header.style, {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%'
        });
        const nameSpan = document.createElement('span');
        nameSpan.innerText = lib.name;
        const removeBtn = document.createElement('span');
        removeBtn.innerHTML = '&#10005;';
        Object.assign(removeBtn.style, {
          cursor: 'pointer', color: '#900', padding: '0 5px', fontWeight: 'bold'
        });
        removeBtn.onclick = () => removeLibrary(lib.name);
        header.appendChild(nameSpan);
        header.appendChild(removeBtn);
        li.appendChild(header);
        if (lib.titles && lib.titles.length > 0) {
          lib.titles.forEach((entry, idx) => {
            const itemUl = document.createElement('ul');
            Object.assign(itemUl.style, {
              listStyle: 'none', paddingLeft: '20px', margin: '5px 0 0 0', fontSize: '0.9em', color: '#555', width: '100%'
            });
            const itemLi = document.createElement('li');
            Object.assign(itemLi.style, {
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', width: '100%'
            });
            const label = document.createElement('span');
            const cn = titleCallNumber(entry);
            label.innerText = cn ? `${titleText(entry)} [${cn}]` : titleText(entry);
            const callBtn = makeButton(cn ? 'Edit Call #' : 'Call #', () => setCallNumber(lib.name, idx), {
              backgroundColor: '#6c757d', padding: '2px 8px', fontSize: '0.85em', flexShrink: '0'
            });
            itemLi.appendChild(label);
            itemLi.appendChild(callBtn);
            itemUl.appendChild(itemLi);
            li.appendChild(itemUl);
          });
        }
        ul.appendChild(li);
      });
      listWrap.appendChild(ul);
    }
    content.appendChild(listWrap);
    const actions = document.createElement('div');
    Object.assign(actions.style, {
      paddingTop: '10px', borderTop: '1px solid #ccc', display: 'flex', flexWrap: 'wrap', gap: '10px'
    });
    if (document.querySelector('input[name="will_supply"]') && document.body.innerText.includes('Borrower:')) {
      actions.appendChild(makeButton('Will Send', willSend, { backgroundColor: '#28a745' }));
    }
    if (document.querySelector('input[name="mark_returned"]') && document.body.innerText.includes('Lender:')) {
      actions.appendChild(makeButton('Mark Returned', markReturned, { backgroundColor: '#007bff' }));
    }
    actions.appendChild(makeButton('Manual Add', manualAdd, { backgroundColor: '#17a2b8' }));
    if (document.querySelector('.responderTransactionForm')) {
      actions.appendChild(makeButton('Checkout', checkoutSearch, { backgroundColor: '#ffc107', color: 'black' }));
    }
    if (document.getElementById('id_responderlist-reject_reason_id') && document.querySelector('input[name="not_supplied"]')) {
      actions.appendChild(makeButton('Mark Not Sending', showNotSendingModal, { backgroundColor: '#e83e8c' }));
    }
    actions.appendChild(makeButton('Clear List', clearList, { backgroundColor: '#dc3545' }));
    if (window.location.href.includes('/labelmaker/')) {
      actions.appendChild(makeButton('Paste List', pasteList, { backgroundColor: '#4CAF50' }));
    }
    content.appendChild(actions);
    const footer = document.createElement('div');
    Object.assign(footer.style, { paddingTop: '10px' });
    footer.appendChild(makeButton('Go to Label Maker', () => {
      window.location.href = 'https://ill2.silo.lib.ia.us/labelmaker/';
    }, { backgroundColor: '#6c757d' }));
    content.appendChild(footer);
  }

  function ensurePrintButton() {
    if (document.getElementById('illCartPrintButton')) return;
    const btn = document.createElement('button');
    btn.id = 'illCartPrintButton';
    btn.innerText = 'Print Pull / Mailing List';
    btn.title = 'Print pull list with call numbers and mailing reference';
    btn.onclick = printPullMailingList;
    Object.assign(btn.style, {
      position: 'fixed', bottom: '16px', right: '16px', zIndex: '99998',
      padding: '10px 14px', cursor: 'pointer', border: 'none', borderRadius: '6px',
      backgroundColor: '#343a40', color: 'white', fontFamily: 'sans-serif', fontSize: '13px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
    });
    document.body.appendChild(btn);
  }

  function init() {
    if (document.getElementById('bookmarkletContentArea')) {
      closeModal();
      return;
    }
    currentLibrary = null;
    const detected = (function () {
      const els = document.getElementsByTagName('b');
      for (let i = 0; i < els.length; i++) {
        const label = els[i].textContent.trim();
        if (label === 'Lender:' || label === 'Borrower:') {
          return els[i].nextSibling.textContent.trim();
        }
      }
      return null;
    })();
    if (detected) addLibrary(detected);
    createModal();
    renderModal();
    ensurePrintButton();
  }

  init();
})();

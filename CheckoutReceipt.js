(function () {
    // Downloads a .rcpt circulation receipt for items checked out during
    // the current session (not every item already on the patron account).
    // Check Out Results only holds the latest scan, so session items are
    // taken from Items Out rows marked fromCheckOut=yes and/or injected
    // after g_itemsoutindex. Matches Booksys / Atriuum slip-printer
    // receipt format so Chrome can auto-open the .rcpt the same way as
    // the built-in button.

    function text(el) {
        return el ? el.textContent.replace(/\s+/g, ' ').trim() : '';
    }

    function nb(n) {
        return '&nbsp;'.repeat(n);
    }

    function parseTitleAuthor(raw) {
        var m = raw.match(/^(.+?)\s*\/\s*(.+)$/);
        if (m) {
            return { title: m[1].trim(), author: m[2].trim() };
        }
        return { title: raw, author: '' };
    }

    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }

    function formatDate(d) {
        return pad2(d.getMonth() + 1) + '/' + pad2(d.getDate()) + '/' + d.getFullYear();
    }

    function formatTime(d) {
        var h = d.getHours();
        var ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12;
        if (h === 0) h = 12;
        return pad2(h) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + ' ' + ampm;
    }

    function getPatronReportClass() {
        var labels = document.querySelectorAll('.fieldName');
        for (var i = 0; i < labels.length; i++) {
            if (text(labels[i]).replace(/:$/, '') === 'Patron Report Class') {
                var td = labels[i].parentElement;
                if (!td) return '';
                var clone = td.cloneNode(true);
                var fn = clone.querySelector('.fieldName');
                if (fn) fn.remove();
                return text(clone);
            }
        }
        return '';
    }

    function getCheckoutResultItems() {
        var items = [];
        var i = 0;
        while (true) {
            var barcodeEl = document.getElementById('ResultBarcode_' + i);
            var titleEl = document.getElementById('ResultTitle_' + i);
            var dueEl = document.getElementById('ResultDueDate_' + i);
            if (!barcodeEl && !titleEl) break;

            var barcode = text(barcodeEl);
            var parsed = parseTitleAuthor(text(titleEl));
            var due = text(dueEl);

            if (barcode || parsed.title) {
                items.push({
                    barcode: barcode,
                    title: parsed.title,
                    author: parsed.author,
                    due: due
                });
            }
            i++;
        }
        return items;
    }

    function getItemsOutIndex() {
        var n = window.g_itemsoutindex;
        if (typeof n === 'number' && isFinite(n)) return n;
        if (typeof n === 'string' && /^\d+$/.test(n)) return parseInt(n, 10);
        var scripts = document.getElementsByTagName('script');
        for (var i = 0; i < scripts.length; i++) {
            var m = (scripts[i].textContent || '').match(/\bg_itemsoutindex\s*=\s*(\d+)/);
            if (m) return parseInt(m[1], 10);
        }
        return null;
    }

    function linkIsSessionCheckout(el) {
        var href = ((el.getAttribute && el.getAttribute('href')) || '') + ' ' + (el.href || '');
        return /fromCheckOut=yes/i.test(href);
    }

    function rowIndexFromId(row) {
        var m = (row && row.id || '').match(/^itemsoutrow_(\d+)$/i);
        return m ? parseInt(m[1], 10) : null;
    }

    function closestRow(el) {
        while (el && el.tagName !== 'TR') el = el.parentElement;
        return el;
    }

    function isSessionRow(row, startIndex) {
        var links = row.querySelectorAll('a[href]');
        for (var i = 0; i < links.length; i++) {
            if (linkIsSessionCheckout(links[i])) return true;
        }
        if (startIndex != null) {
            var idx = rowIndexFromId(row);
            if (idx != null && idx > startIndex) return true;
        }
        return false;
    }

    function getSessionRows() {
        var startIndex = getItemsOutIndex();
        var seen = [];

        function add(row) {
            if (!row || row.tagName !== 'TR') return;
            for (var i = 0; i < seen.length; i++) {
                if (seen[i] === row) return;
            }
            seen.push(row);
        }

        var rows = document.querySelectorAll('[id^="itemsoutrow_"]');
        for (var r = 0; r < rows.length; r++) {
            if (isSessionRow(rows[r], startIndex)) add(rows[r]);
        }

        var links = document.querySelectorAll('a[href]');
        for (var l = 0; l < links.length; l++) {
            if (linkIsSessionCheckout(links[l])) add(closestRow(links[l]));
        }

        seen.sort(function (a, b) {
            var ia = rowIndexFromId(a);
            var ib = rowIndexFromId(b);
            if (ia != null && ib != null && ia !== ib) return ia - ib;
            if (ia != null && ib == null) return -1;
            if (ia == null && ib != null) return 1;
            return 0;
        });
        return seen;
    }

    function normalizeHeader(s) {
        return s.replace(/:$/, '').replace(/\s+/g, ' ').trim().toLowerCase();
    }

    function headerMatches(header, want) {
        if (header === want) return true;
        return new RegExp('(?:^|\\s)' + want.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:\\s|$)').test(header);
    }

    function findColumn(map, names) {
        var keys = Object.keys(map);
        var n, k;
        for (n = 0; n < names.length; n++) {
            if (map[names[n]] != null) return map[names[n]];
        }
        for (n = 0; n < names.length; n++) {
            for (k = 0; k < keys.length; k++) {
                if (headerMatches(keys[k], names[n])) return map[keys[k]];
            }
        }
        return -1;
    }

    function getHeaderMap(row) {
        var table = row.parentElement;
        while (table && table.tagName !== 'TABLE') table = table.parentElement;
        if (!table) return {};

        var rows = table.querySelectorAll('tr');
        var headerRow = null;
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].querySelector('th')) {
                headerRow = rows[i];
                break;
            }
            var cells = rows[i].children;
            var joined = [];
            for (var c = 0; c < cells.length; c++) {
                joined.push(normalizeHeader(text(cells[c])));
            }
            var blob = joined.join(' ');
            if (/\btitle\b/.test(blob) && (/\bbarcode\b/.test(blob) || /\bdue\b/.test(blob))) {
                headerRow = rows[i];
                break;
            }
        }

        var map = {};
        if (!headerRow) return map;
        var hcells = headerRow.querySelectorAll('th, td');
        for (var j = 0; j < hcells.length; j++) {
            var name = normalizeHeader(text(hcells[j]));
            if (name && map[name] == null) map[name] = j;
        }
        return map;
    }

    function cellText(cells, index) {
        if (index < 0 || index >= cells.length) return '';
        return text(cells[index]);
    }

    function looksLikeDate(s) {
        return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s);
    }

    function looksLikeBarcode(s) {
        var compact = s.replace(/\s+/g, '');
        return /^\d{6,}$/.test(compact) || /^[A-Za-z]-?\d{6,}$/.test(compact);
    }

    function extractItemFromRow(row) {
        var cells = row.querySelectorAll('td, th');
        var map = getHeaderMap(row);
        var titleIdx = findColumn(map, ['title', 'item title']);
        var authorIdx = findColumn(map, ['author']);
        var barcodeIdx = findColumn(map, ['barcode', 'item barcode']);
        var dueIdx = findColumn(map, ['due date', 'date due', 'due']);

        var titleRaw = '';
        var reviewLink = row.querySelector('a[href*="ReviewItems"], a[href*="ReviewItem"]');
        if (reviewLink) titleRaw = text(reviewLink);
        if (!titleRaw) titleRaw = cellText(cells, titleIdx);

        var author = cellText(cells, authorIdx);
        var barcode = cellText(cells, barcodeIdx);
        var due = cellText(cells, dueIdx);

        if (!titleRaw || !barcode || !due) {
            for (var i = 0; i < cells.length; i++) {
                var t = text(cells[i]);
                if (!t) continue;
                if (!barcode && looksLikeBarcode(t)) barcode = t;
                else if (!due && looksLikeDate(t)) due = t;
                else if (!titleRaw && t.length > 2 && !looksLikeDate(t) && !looksLikeBarcode(t) && t.toLowerCase() !== 'x') {
                    titleRaw = t;
                }
            }
        }

        var parsed = parseTitleAuthor(titleRaw);
        if (!author) author = parsed.author;

        if (!parsed.title && !barcode) return null;
        return {
            barcode: barcode,
            title: parsed.title,
            author: author,
            due: due
        };
    }

    function itemKey(item) {
        if (item.barcode) return 'b:' + item.barcode.replace(/\s+/g, '');
        return 't:' + (item.title || '').toLowerCase();
    }

    function getCheckoutItems() {
        var items = [];
        var seen = {};

        function add(item) {
            if (!item || (!item.barcode && !item.title)) return;
            var key = itemKey(item);
            if (seen[key]) return;
            seen[key] = true;
            items.push(item);
        }

        var rows = getSessionRows();
        for (var i = 0; i < rows.length; i++) {
            add(extractItemFromRow(rows[i]));
        }

        var results = getCheckoutResultItems();
        for (var j = 0; j < results.length; j++) {
            add(results[j]);
        }
        return items;
    }

    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function buildItemHtml(item) {
        var html = '<BR>' + nb(2) + escapeHtml(item.barcode) + nb(1) + escapeHtml(item.title) + nb(1) + '<BR>\n';
        if (item.author) {
            html += nb(2) + '(' + escapeHtml(item.author) + ')<BR>\n';
        } else {
            html += '\n';
        }
        html += '\n\n' + nb(2) + escapeHtml(item.due) + '<BR>\n';
        return html;
    }

    function buildReceiptHtml(items, reportClass, when) {
        var itemBlocks = items.map(buildItemHtml).join('\n\n\n\n\n');
        return '<HTML>\n' +
            '<HEAD>\n' +
            '<!-- Gotcha\'s for the Epson Slip Printer:\n' +
            '        - anything inside a SPAN tag will be colored red (if color is turned on) \n' +
            '        - it CANNOT print black and red on the same line, if you try the red will not appear,\n' +
            '          instead a 1 or 0 will show up where the red was supposed to start -->\n' +
            '          \n' +
            '<style>\n' +
            'Font.Courier {font-family:"Courier New";font-size:8pt;}\n' +
            '</style>\n' +
            '<style type="text/css">\n' +
            '.redtext {\n' +
            '   \tcolor: red;\n' +
            '\tfont-weight: bold;\n' +
            '}\n' +
            '</style>\n' +
            '\n' +
            '<TITLE>Patron Receipt</TITLE>\n' +
            '</HEAD>\n' +
            '<BODY BGCOLOR="#FFFFFF"  >\n' +
            '\n' +
            '\n' +
            '<font class=Courier>\n' +
            '<B>\n' +
            '<BR>' + nb(6) + '<b>Waverly' + nb(1) + 'Public' + nb(1) + 'Library<BR>' +
            nb(13) + '319-352-1223<BR>' +
            nb(6) + 'www.waverlyia.com/library<BR><BR> <BR>--------------------------------------\n' +
            '<BR><B>Receipt for Patron \n' +
            '</B><BR>' + nb(2) + '<B>Patron Report Class:</B> ' + escapeHtml(reportClass) + '\n' +
            '<BR>\n' +
            '\n' +
            '\n' +
            '\n' +
            '\n' +
            '\n' +
            '\n' +
            '\n' +
            '\n' +
            '<BR><B>Items Out</B>\n' +
            '\n' +
            '\n' +
            itemBlocks +
            '\n' +
            '\n' +
            '\n' +
            '\n' +
            '\n' +
            '\n' +
            '\n' +
            '<BR><BR>--------------------------------------\n' +
            '<BR>' + formatDate(when) + nb(18) + formatTime(when) + '\n' +
            '<BR><BR>' + nb(3) + 'Library' + nb(1) + 'Hours:' + nb(1) + 'Please' + nb(1) + 'visit' + nb(1) + 'our<BR>' +
            nb(1) + 'website' + nb(1) + 'or' + nb(1) + 'call' + nb(1) + 'for' + nb(1) + 'latest' + nb(1) + 'updates.<BR>\n' +
            '\n' +
            '<BR><BR><BR><BR>\n' +
            '\n' +
            '\n' +
            '</B>\n' +
            '<BR>\n' +
            '</font>\n' +
            '</BODY>\n' +
            '</HTML>\n';
    }

    function downloadReceipt(html) {
        var blob = new Blob([html], { type: 'text/html' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'PatronReceipt.rcpt';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            a.remove();
            URL.revokeObjectURL(url);
        }, 1000);
    }

    var items = getCheckoutItems();
    if (!items.length) {
        alert('No items from this checkout session were found.\n\nCheck out one or more items first, then run this bookmarklet again.');
        return;
    }

    var reportClass = getPatronReportClass();
    var html = buildReceiptHtml(items, reportClass, new Date());
    downloadReceipt(html);
})();

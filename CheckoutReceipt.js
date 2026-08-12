(function () {
    // Readable source. To install in Chrome, copy the contents of
    // CheckoutReceipt.bookmarklet.js into a bookmark's URL field.
    //
    // Downloads a .rcpt circulation receipt for items checked out during
    // the current session (not every item already on the patron account).
    // Session items are Items Out rows in #tableData whose title link
    // onclick contains fromCheckOut=yes (Atriuum's client-rendered scan
    // marker). Check Out Results is used only if no session rows exist.
    // Matches Booksys / Atriuum slip-printer receipt format so Chrome can
    // auto-open the .rcpt the same way as the built-in button.

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

    function getSessionRows() {
        var rows = document.querySelectorAll('#tableData tr[id^="itemsoutrow_"]');
        var session = [];
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].querySelector('a[onclick*="fromCheckOut=yes"]')) {
                session.push(rows[i]);
            }
        }
        return session;
    }

    function extractItemFromRow(row) {
        var titleRaw = text(row.querySelector('a[id^="CheckedOutTitle_"]'));
        var barcode = text(row.querySelector('span[id^="CheckedOutBarcode_"]'));
        var due = text(row.querySelector('span[id^="CheckedOutDueDate_"]'));
        var parsed = parseTitleAuthor(titleRaw);
        if (!parsed.title && !barcode) return null;
        return {
            barcode: barcode,
            title: parsed.title,
            author: parsed.author,
            due: due
        };
    }

    function getCheckoutItems() {
        var items = [];
        var rows = getSessionRows();
        for (var i = 0; i < rows.length; i++) {
            var item = extractItemFromRow(rows[i]);
            if (item) items.push(item);
        }
        if (items.length) return items;
        return getCheckoutResultItems();
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

    try {
        var items = getCheckoutItems();
        if (!items.length) {
            alert('No items from this checkout session were found.\n\nCheck out one or more items first, then run this bookmarklet again.');
            return;
        }

        var reportClass = getPatronReportClass();
        var html = buildReceiptHtml(items, reportClass, new Date());
        downloadReceipt(html);
    } catch (err) {
        alert('Checkout receipt failed:\n' + (err && err.message ? err.message : err));
    }
})();

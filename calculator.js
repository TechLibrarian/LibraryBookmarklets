(function() {
    let id = 'bm-calc-h',
        ex = document.getElementById(id);
    if (ex) {
        ex.remove();
        return;
    }

    let mk = (t, c, x) => {
        let e = document.createElement(t);
        if (c) e.className = c;
        if (x) e.textContent = x;
        return e;
    };

    let s = {
            c: '0',
            p: null,
            o: null,
            w: 0,
            f: 1,
            l: {
                t: '20px',
                l: '20px'
            }
        },
        LS = 'bmCalcS';

    try {
        let v = localStorage.getItem(LS);
        if (v) s = {
            ...s,
            ...JSON.parse(v)
        };
    } catch (e) {}

    s.f = 1;
    let sv = () => localStorage.setItem(LS, JSON.stringify({
            ...s,
            f: 0
        })),
        h = document.createElement('div');

    h.id = id;
    h.style.cssText = `all:initial;position:fixed;z-index:2147483647;top:${s.l.t};left:${s.l.l}`;

    let r = h.attachShadow({
            mode: 'open'
        }),
        st = mk('style', '', `:host{font-family:-apple-system,sans-serif}*{box-sizing:border-box;user-select:none}.w{width:240px;background:#202020;border-radius:10px;box-shadow:0 10px 30px #000b;overflow:hidden;border:2px solid #444;transition:border-color .2s}.w.a{border-color:#34c759}.hd{background:#2d2d2d;padding:8px;display:flex;justify-content:space-between;cursor:grab}.x{color:#ff5f57;font-weight:700;cursor:pointer;padding:0 5px}.sc{background:#1a1a1a;color:#fff;padding:15px;text-align:right;cursor:copy;position:relative}.sb{color:#888;font-size:12px;min-height:15px}.mn{font-size:26px;font-weight:300;word-break:break-all}.g{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#333}button{border:none;padding:15px 0;font-size:18px;background:#444;color:#eee;cursor:pointer;outline:none}button:active{filter:brightness(.8)}.op{background:#ff9f0a;color:#fff}.eq{background:#34c759;color:#fff;grid-row:span 2}.z{grid-column:span 2}.ut{background:#5a5a5a}#tp{position:absolute;top:5px;left:5px;font-size:10px;background:#34c759;color:#fff;padding:2px 6px;opacity:0;border-radius:4px;transition:opacity .3s}`);

    r.append(st);

    let wp = mk('div', 'w a'),
        hd = mk('div', 'hd'),
        tt = mk('span', '', 'Calc');

    tt.style.color = '#888';
    tt.style.fontSize = '12px';

    let cl = mk('span', 'x', '✕'),
        sc = mk('div', 'sc'),
        tp = mk('div', '', 'Copied!'),
        sb = mk('div', 'sb', s.p ? s.p + ' ' + s.o : ''),
        mn = mk('div', 'mn', s.c),
        pd = mk('div', 'g');

    tp.id = 'tp';
    hd.append(tt, cl);
    sc.append(tp, sb, mn);
    wp.append(hd, sc, pd);
    r.append(wp);
    document.body.append(h);

    let up = () => {
            mn.textContent = s.c;
            sb.textContent = s.p ? s.p + ' ' + s.o : '';
            sv();
        },
        cal = () => {
            if (!s.o || s.p == null) return;
            let a = +s.p,
                b = +s.c,
                z = 0;
            switch (s.o) {
                case '+':
                    z = a + b;
                    break;
                case '-':
                    z = a - b;
                    break;
                case '*':
                    z = a * b;
                    break;
                case '/':
                    z = a / b;
            }
            s.c = +z.toPrecision(12) + '';
            s.p = null;
            s.o = null;
            s.w = 1;
            up();
        },
        op = o => {
            if (s.o && !s.w) cal();
            s.p = s.c;
            s.o = o;
            s.w = 1;
            up();
        },
        nm = n => {
            if (isNaN(parseInt(n))) return;
            if (s.w) {
                s.c = n;
                s.w = 0;
            } else s.c = s.c == '0' ? n : s.c + n;
            up();
        },
        act = () => {
            s.f = 1;
            wp.classList.add('a');
        },
        dct = () => {
            s.f = 0;
            wp.classList.remove('a');
        },
        ops = {
            'C': () => {
                s = {
                    ...s,
                    c: '0',
                    p: null,
                    o: null,
                    w: 0
                };
                up();
            },
            '⌫': () => {
                if (!s.w) {
                    s.c = s.c.length > 1 ? s.c.slice(0, -1) : '0';
                    up();
                }
            },
            '=': cal,
            '.': () => {
                if (s.w) {
                    s.c = '0.';
                    s.w = 0;
                } else if (!s.c.includes('.')) s.c += '.';
                up();
            }
        };

    [
        ['C', 'ut'],
        ['⌫', 'ut'],
        ['/', 'op'],
        ['*', 'op'],
        ['7'],
        ['8'],
        ['9'],
        ['-', 'op'],
        ['4'],
        ['5'],
        ['6'],
        ['+', 'op'],
        ['1'],
        ['2'],
        ['3'],
        ['=', 'eq'],
        ['0', 'z'],
        ['.']
    ].forEach(b => {
        let btn = mk('button', b[1] || '', b[0]);
        btn.onclick = () => {
            act();
            if (['+', '-', '*', '/'].includes(b[0])) op(b[0]);
            else if (ops[b[0]]) ops[b[0]]();
            else nm(b[0]);
        };
        pd.append(btn);
    });

    cl.onclick = () => h.remove();

    sc.onclick = () => {
        navigator.clipboard.writeText(s.c);
        let t = r.getElementById('tp');
        t.style.opacity = 1;
        setTimeout(() => t.style.opacity = 0, 800);
    };

    document.addEventListener('mousedown', e => {
        if (h.contains(e.target)) act();
        else dct();
    }, !0);

    let kh = e => {
        if (!document.getElementById(id)) return window.removeEventListener('keydown', kh, !0);
        if (!s.f || e.ctrlKey || e.metaKey || e.altKey) return;
        let k = e.key;
        if (k == 'Escape') {
            e.preventDefault();
            e.stopImmediatePropagation();
            if (s.c === '0' && s.p === null) h.remove();
            else ops['C']();
            return;
        }
        let m = {
                'Enter': '=',
                'Backspace': '⌫'
            },
            v = '0123456789.+-*/=c'.split('');
        if (v.includes(k) || m[k]) {
            e.stopImmediatePropagation();
            e.preventDefault();
            let a = m[k] || k;
            if (a == 'c' || a == 'C') ops['C']();
            else if (['+', '-', '*', '/'].includes(a)) op(a);
            else if (ops[a]) ops[a]();
            else nm(a);
        }
    };

    window.addEventListener('keydown', kh, !0);

    hd.onmousedown = e => {
        e.preventDefault();
        act();
        let rc = h.getBoundingClientRect(),
            ox = e.clientX - rc.left,
            oy = e.clientY - rc.top,
            mv = ev => {
                h.style.left = (ev.clientX - ox) + 'px';
                h.style.top = (ev.clientY - oy) + 'px';
            },
            up = () => {
                document.removeEventListener('mousemove', mv);
                document.removeEventListener('mouseup', up);
                s.l = {
                    t: h.style.top,
                    l: h.style.left
                };
                sv();
            };
        document.addEventListener('mousemove', mv);
        document.addEventListener('mouseup', up);
    };
})();
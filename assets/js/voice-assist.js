(function () {
  var C = '#2f5fd0', map = new WeakMap(), live = [];
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null, recFor = null;
  function setVal(el, v) {
    var p = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(p, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function label(el) { var l = el.closest('label'); var s = l && l.querySelector('span'); return s ? s.textContent.trim() : ''; }
  function kind(el) {
    if (el.readOnly || el.disabled || el.type === 'hidden') return null;
    var im = el.getAttribute('inputmode') || el.inputMode || '', ph = el.placeholder || '';
    if (el.maxLength > 0 && el.maxLength < 20 || /^-+$/.test(ph) || /HN|OTP/i.test(ph)) return null;
    if (/^(เวลา)/.test(label(el)) || /ไปรษณีย์/.test(label(el))) return null;
    if (/^\d{1,2}:\d{2}$/.test(ph)) return null;
    if (el.hasAttribute && el.hasAttribute('data-nomic')) return null;
    var w = el.getBoundingClientRect().width;
    if (im === 'numeric' || im === 'decimal' || /^จำนวน/.test(label(el))) return w >= 110 ? 'num' : null;
    if (window.ENH_NO_MIC || w < 150) return null;
    if (el.tagName === 'TEXTAREA' || el.type === 'text' || !el.type) return 'text';
    return null;
  }
  function btn(txt, aria, size, icon) {
    var b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', aria); b.setAttribute('data-enh', '1');
    b.style.cssText = 'position:absolute;z-index:2;width:' + size + 'px;height:' + size + 'px;border:2px solid ' + C + ';border-radius:' + (icon ? '50%' : '8px') + ';background:#fff;color:' + C + ';font:700 20px/1 sans-serif;padding:0;display:flex;align-items:center;justify-content:center;cursor:pointer';
    b.innerHTML = txt; return b;
  }
  function toast(m) {
    var t = document.createElement('div');
    t.textContent = m; t.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#1b2328;color:#fff;padding:12px 18px;border-radius:14px;font:600 16px sans-serif;z-index:99999;max-width:80vw;text-align:center';
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  function stopRec() { if (rec) { try { rec.stop(); } catch (e) {} } }
  function speak(el, mic) {
    if (!SR) { toast('อุปกรณ์นี้ไม่รองรับการพิมพ์ด้วยเสียง'); return; }
    if (recFor === el) { stopRec(); return; }
    stopRec();
    var r = new SR(); r.lang = 'th-TH'; r.interimResults = false; r.continuous = false;
    r.onresult = function (e) {
      var txt = ''; for (var i = e.resultIndex; i < e.results.length; i++) txt += e.results[i][0].transcript;
      var cur = el.value || ''; setVal(el, cur + (cur && !/\s$/.test(cur) ? ' ' : '') + txt.trim());
    };
    r.onerror = function (e) { toast(e.error === 'not-allowed' ? 'กรุณาอนุญาตการใช้ไมโครโฟน' : 'ฟังเสียงไม่สำเร็จ ลองใหม่อีกครั้ง'); };
    r.onend = function () { recFor = null; rec = null; mic.style.background = '#fff'; mic.style.color = C; };
    rec = r; recFor = el; mic.style.background = '#d93025'; mic.style.color = '#fff';
    try { r.start(); } catch (e) { r.onend(); }
  }
  var MIC = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';
  function enhance(el, k) {
    var p = el.parentElement; if (!p) return;
    if (getComputedStyle(p).position === 'static') p.style.position = 'relative';
    var els = { k: k };
    if (k === 'num') {
      els.m = btn('−', 'ลด', 30); els.p = btn('+', 'เพิ่ม', 30);
      var step = function (d) { return function (e) { e.preventDefault(); var n = parseFloat(String(el.value).replace(/,/g, '')) || 0; n = Math.max(0, Math.round((n + d) * 10) / 10); setVal(el, String(n)); }; };
      els.m.onclick = step(-1); els.p.onclick = step(1);
      el.style.textAlign = 'center'; el.style.paddingLeft = '40px'; el.style.paddingRight = '40px';
      p.appendChild(els.m); p.appendChild(els.p);
    } else {
      els.t = btn(MIC, 'พิมพ์ด้วยเสียง', 40, true);
      els.t.onclick = function (e) { e.preventDefault(); speak(el, els.t); };
      el.style.paddingRight = '54px';
      p.appendChild(els.t);
    }
    map.set(el, els); live.push(el);
  }
  function place(el) {
    var e = map.get(el), h = el.offsetHeight, top = el.offsetTop, l = el.offsetLeft, w = el.offsetWidth;
    var sz = Math.min(e.k === 'num' ? 30 : 40, h - 8);
    function put(b, x, y) { b.style.width = b.style.height = sz + 'px'; b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.display = el.offsetParent ? 'flex' : 'none'; }
    var mid = top + (h - sz) / 2;
    if (e.k === 'num') { put(e.m, l + 4, mid); put(e.p, l + w - sz - 4, mid); }
    else put(e.t, l + w - sz - 7, el.tagName === 'TEXTAREA' ? top + 6 : mid);
  }
  function scan() {
    document.querySelectorAll('input,textarea').forEach(function (el) {
      if (map.has(el) || !el.offsetParent) return;
      var k = kind(el); if (k) enhance(el, k);
    });
    live = live.filter(function (el) {
      var e = map.get(el);
      if (!el.isConnected) { Object.keys(e).forEach(function (x) { if (x !== 'k' && e[x].remove) e[x].remove(); }); return false; }
      place(el); return true;
    });
  }
  setInterval(scan, 350);
  document.addEventListener('DOMContentLoaded', scan);
})();

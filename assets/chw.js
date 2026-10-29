/* Doctor Assist — บทบาทเยี่ยมบ้าน (อสม. / นักวิชาการสาธารณสุข) */
(function () {
  'use strict';
  var D = window.CHW;
  var $ = function (id) { return document.getElementById(id); };
  var screen = $('screen'), cta = $('cta'), nav = $('nav'), phone = document.querySelector('.phone');

  var ROLES = {
    vhv: { label: 'อสม.', who: 'อสม. มาลัย ใจดี', where: 'ม.3 บ้านหนองบัว · รพ.สต.บ้านหนองบัว', login: 'Login with ProviderID', badge: 'PROVIDER' },
    officer: { label: 'นักวิชาการสาธารณสุข', who: 'นางสาวกมลวรรณ สุขดี', where: 'นักวิชาการสาธารณสุข · รพ.สต.บ้านหนองบัว', login: 'Login with ProviderID', badge: 'PROVIDER' }
  };

  var S = { s: 'login', role: 'vhv', tab: 'home', v: null, done: {}, open: {} };
  try { S.done = JSON.parse(localStorage.getItem('da-chw-done') || '{}') || {}; } catch (e) {}

  function esc(x) {
    return String(x == null ? '' : x).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function ms(name, extra) { return '<span class="ms' + (extra ? ' ' + extra : '') + '" aria-hidden="true">' + name + '</span>'; }
  function home(id) { return D.HOMES.filter(function (h) { return h.id === id; })[0]; }
  function num(v) { var n = parseFloat(v); return isFinite(n) && n > 0 ? n : null; }
  function toast(t) {
    var el = $('toast'); el.textContent = t; el.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }
  function saveDone() { try { localStorage.setItem('da-chw-done', JSON.stringify(S.done)); } catch (e) {} }

  /* ================= analysis ================= */
  function measures(v) {
    var m = v.m, out = {};
    var s = [num(m.sbp1), num(m.sbp2)].filter(Boolean), d = [num(m.dbp1), num(m.dbp2)].filter(Boolean);
    if (s.length && d.length) {
      out.sbp = Math.round(s.reduce(function (a, b) { return a + b; }) / s.length);
      out.dbp = Math.round(d.reduce(function (a, b) { return a + b; }) / d.length);
    }
    out.hr = num(m.hr); out.dtx = num(m.dtx); out.o2 = num(m.o2); out.temp = num(m.temp);
    out.wt = num(m.wt); out.ht = num(m.ht); out.waist = num(m.waist);
    if (out.wt && out.ht) out.bmi = out.wt / Math.pow(out.ht / 100, 2);
    return out;
  }

  // level: bad (ปรึกษาแพทย์วันนี้/ส่งต่อ) · warn (ติดตาม) · ok · info
  function analyse(v) {
    var h = home(v.id), x = measures(v), a = v.a, f = [];
    var has = function (k) { return h.dz.indexOf(k) > -1; };

    if (a.redflag) f.push({ lv: 'bad', ic: 'emergency', t: 'มีอาการเตือนอันตราย', val: a.redflagText || 'ตามที่ประเมิน', act: 'ส่งต่อโรงพยาบาลทันที หรือโทร 1669', dev: '' });

    if (x.sbp) {
      var bp = x.sbp + '/' + x.dbp + ' mmHg (เฉลี่ย 2 ครั้ง)';
      if (x.sbp >= 180 || x.dbp >= 110) f.push({ lv: 'bad', ic: 'blood_pressure', t: 'ความดันสูงระดับวิกฤต', val: bp, act: 'วัดซ้ำหลังนั่งพัก 5 นาที ถ้ายังสูงหรือมีอาการ ส่งต่อทันที', icd: 'I10', dev: 'bp' });
      else if (x.sbp >= 140 || x.dbp >= 90) {
        if (has('HT')) f.push({ lv: 'warn', ic: 'blood_pressure', t: 'ความดันยังคุมไม่ได้', val: bp + ' · เป้าหมาย < 140/90', act: 'ส่งค่าให้แพทย์ปรับยาทาง Telemedicine (Tele-F/U)', icd: 'I10', dev: 'bp' });
        else f.push({ lv: 'warn', ic: 'blood_pressure', t: 'สงสัยความดันโลหิตสูง (รายใหม่)', val: bp, act: 'ให้วัดที่บ้านเช้า-เย็น 7 วัน หรือนัดวัดซ้ำที่ รพ.สต. ก่อนแพทย์วินิจฉัย', icd: 'R03.0', dev: 'bp' });
      } else if (x.sbp >= 130 || x.dbp >= 85) f.push({ lv: 'info', ic: 'blood_pressure', t: 'ความดันสูงกว่าปกติเล็กน้อย', val: bp, act: 'แนะนำลดเค็ม ออกกำลังกาย วัดซ้ำในการเยี่ยมครั้งถัดไป', dev: 'bp' });
      else f.push({ lv: 'ok', ic: 'blood_pressure', t: 'ความดันปกติ', val: bp, act: '', dev: 'bp' });
    }

    if (x.dtx) {
      var g = x.dtx + ' mg/dL' + (v.fasting ? ' (งดอาหาร)' : ' (หลังอาหาร/สุ่ม)');
      if (x.dtx < 70) f.push({ lv: 'bad', ic: 'glucose', t: 'น้ำตาลต่ำ', val: g, act: 'ให้น้ำหวาน/ลูกอม 15 กรัม วัดซ้ำใน 15 นาที แจ้งแพทย์', icd: 'E16.2', dev: 'dtx' });
      else if (has('DM')) {
        if ((v.fasting && x.dtx > 180) || (!v.fasting && x.dtx >= 250)) f.push({ lv: 'bad', ic: 'glucose', t: 'น้ำตาลสูงมาก', val: g, act: 'ปรึกษาแพทย์วันนี้ ตรวจ HbA1c (เบิกได้ 150 บาท)', icd: 'E11', dev: 'dtx' });
        else if ((v.fasting && x.dtx > 130) || (!v.fasting && x.dtx >= 180)) f.push({ lv: 'warn', ic: 'glucose', t: 'น้ำตาลสูงกว่าเป้าหมาย', val: g, act: 'ทบทวนการกินยา/อาหาร ส่งแพทย์ปรับยา และตรวจ HbA1c', icd: 'E11', dev: 'dtx' });
        else f.push({ lv: 'ok', ic: 'glucose', t: 'น้ำตาลอยู่ในเป้าหมาย', val: g, act: '', dev: 'dtx' });
      } else if ((v.fasting && x.dtx >= 126) || (!v.fasting && x.dtx >= 200)) {
        f.push({ lv: 'warn', ic: 'glucose', t: 'สงสัยเบาหวาน (ปลายนิ้วยังวินิจฉัยไม่ได้)', val: g, act: 'นัดเจาะ FPG งดอาหาร 8 ชม. ที่ รพ.สต. เพื่อยืนยัน', icd: 'R73.9', dev: 'dtx' });
      } else if (v.fasting && x.dtx >= 100) {
        f.push({ lv: 'info', ic: 'glucose', t: 'กลุ่มเสี่ยงเบาหวาน', val: g, act: 'ปรับพฤติกรรม คัดกรองซ้ำทุกปี', icd: 'R73.0', dev: 'dtx' });
      } else f.push({ lv: 'ok', ic: 'glucose', t: 'น้ำตาลปกติ', val: g, act: '', dev: 'dtx' });
    }

    if (x.o2) {
      var o = 'SpO₂ ' + x.o2 + '%';
      if (has('COPD')) {
        if (x.o2 < 88) f.push({ lv: 'bad', ic: 'spo2', t: 'ออกซิเจนต่ำกว่าเป้าหมายผู้ป่วย COPD', val: o + ' · เป้า 88–92%', act: 'ส่งต่อทันที', dev: 'spo2' });
        else if (x.o2 < 92) f.push({ lv: 'warn', ic: 'spo2', t: 'ออกซิเจนอยู่ขอบล่างของเป้าหมาย COPD', val: o + ' · เป้า 88–92%', act: 'ดูอัตราการหายใจและอาการหอบ ส่งค่าให้แพทย์วันนี้', dev: 'spo2' });
        else f.push({ lv: 'ok', ic: 'spo2', t: 'ออกซิเจนอยู่ในเป้าหมาย', val: o, act: '', dev: 'spo2' });
      } else if (x.o2 < 90) f.push({ lv: 'bad', ic: 'spo2', t: 'ออกซิเจนต่ำ', val: o, act: 'ส่งต่อทันที', dev: 'spo2' });
      else if (x.o2 < 95) f.push({ lv: 'warn', ic: 'spo2', t: 'ออกซิเจนต่ำกว่าปกติ', val: o, act: 'วัดซ้ำขณะพัก ดูอาการหอบ ส่งค่าให้แพทย์', dev: 'spo2' });
      else f.push({ lv: 'ok', ic: 'spo2', t: 'ออกซิเจนปกติ', val: o, act: '', dev: 'spo2' });
    }

    if (x.temp) {
      var t = x.temp + ' °C';
      if (has('BED') && x.temp >= 37.5) f.push({ lv: 'bad', ic: 'thermostat', t: 'ผู้ป่วยติดเตียงมีไข้', val: t + (x.o2 && x.o2 < 95 ? ' ร่วมกับ SpO₂ ' + x.o2 + '%' : ''), act: 'สงสัยติดเชื้อ (ปอดอักเสบจากการสำลัก / ทางเดินปัสสาวะ / แผลกดทับ) ปรึกษาแพทย์วันนี้', icd: 'R50.9', dev: 'temp' });
      else if (x.temp >= 39) f.push({ lv: 'bad', ic: 'thermostat', t: 'ไข้สูง', val: t, act: 'ปรึกษาแพทย์วันนี้', icd: 'R50.9', dev: 'temp' });
      else if (x.temp >= 37.5) f.push({ lv: 'warn', ic: 'thermostat', t: 'มีไข้', val: t, act: 'เช็ดตัว ดื่มน้ำ ถามอาการร่วม ติดตาม 24 ชม.', icd: 'R50.9', dev: 'temp' });
      else f.push({ lv: 'ok', ic: 'thermostat', t: 'ไม่มีไข้', val: t, act: '', dev: 'temp' });
    }

    if (x.hr) {
      if (x.hr > 120 || x.hr < 45) f.push({ lv: 'bad', ic: 'cardiology', t: 'ชีพจรผิดปกติมาก', val: x.hr + ' ครั้ง/นาที', act: 'ส่งต่อ ตรวจ ECG', icd: x.hr > 120 ? 'R00.0' : 'R00.1', dev: 'bp' });
      else if (x.hr > 100) f.push({ lv: 'warn', ic: 'cardiology', t: 'ชีพจรเร็ว', val: x.hr + ' ครั้ง/นาที', act: 'วัดซ้ำหลังพัก หากยังเร็วแจ้งแพทย์ (ECG ช่วยคัดกรองหัวใจเต้นผิดจังหวะ)', icd: 'R00.0', dev: 'bp' });
    }

    if (x.bmi) {
      var b = 'BMI ' + x.bmi.toFixed(1) + (x.waist ? ' · รอบเอว ' + x.waist + ' ซม.' : '');
      var belly = x.waist && ((h.sex === 'ชาย' && x.waist >= 90) || (h.sex === 'หญิง' && x.waist >= 80));
      if (x.bmi >= 25 || belly) f.push({ lv: 'warn', ic: 'monitor_weight', t: belly && x.bmi >= 25 ? 'อ้วนและอ้วนลงพุง' : belly ? 'อ้วนลงพุง' : 'ภาวะอ้วน', val: b, act: 'ให้คำแนะนำอาหาร/ออกกำลังกาย คัดกรองไขมัน TC/HDL (อายุ 45–70 ปี เบิกได้)', icd: 'E66.9', dev: 'body' });
      else if (x.bmi < 18.5) f.push({ lv: 'warn', ic: 'monitor_weight', t: 'น้ำหนักต่ำกว่าเกณฑ์', val: b, act: 'ประเมินภาวะโภชนาการ โดยเฉพาะผู้สูงอายุ/ติดเตียง', icd: 'E46', dev: 'body' });
      else f.push({ lv: 'ok', ic: 'monitor_weight', t: 'น้ำหนักเหมาะสม', val: b, act: '', dev: 'body' });
    }

    if (a.meds === false) f.push({ lv: 'warn', ic: 'medication', t: 'กินยาไม่สม่ำเสมอ', val: 'ตามที่ผู้ป่วย/ญาติแจ้ง', act: 'ทบทวนวิธีกินยา ส่งข้อมูลให้เภสัชกร/แพทย์' });
    if (a.q2) f.push({ lv: 'warn', ic: 'psychology', t: 'คัดกรองซึมเศร้า (2Q) ผลบวก', val: 'ตอบ "ใช่" อย่างน้อย 1 ข้อ', act: 'ให้ จนท. ประเมิน 9Q ต่อ' });
    if (a.fall) f.push({ lv: 'warn', ic: 'elderly', t: 'เคยหกล้มใน 6 เดือน', val: '', act: 'ประเมินบ้าน ราวจับ แสงสว่าง ทบทวนยาที่ทำให้เวียนหัว' });
    if (a.wound) f.push({ lv: 'warn', ic: 'healing', t: 'มีแผล (แผลกดทับ / แผลที่เท้า)', val: '', act: 'ถ่ายภาพแผลแนบส่งแพทย์ สอนญาติพลิกตัว/ดูแลเท้า' });

    var rank = { bad: 0, warn: 1, info: 2, ok: 3 };
    f.sort(function (p, q) { return rank[p.lv] - rank[q.lv]; });
    return { x: x, f: f, h: h };
  }

  function disposition(R, v) {
    if (v.a.redflag || R.f.some(function (f) { return f.lv === 'bad' && /ส่งต่อทันที/.test(f.act); })) return { lv: 'bad', ic: 'emergency', t: 'ส่งต่อโรงพยาบาลทันที', s: 'โทร 1669 หรือประสาน รพ.สต. เพื่อส่งต่อ' };
    if (R.f.some(function (f) { return f.lv === 'bad'; })) return { lv: 'bad', ic: 'video_call', t: 'ปรึกษาแพทย์ทางไกลวันนี้', s: 'ส่งข้อมูลการวัดเข้าคิว Telemedicine ให้พยาบาลคัดกรอง' };
    if (R.f.some(function (f) { return f.lv === 'warn'; })) return { lv: 'warn', ic: 'event_upcoming', t: 'ส่งข้อมูลให้แพทย์/จนท. และนัดติดตาม', s: 'ไม่เร่งด่วน แต่ต้องมีผู้ดูผลภายใน 1 สัปดาห์' };
    return { lv: 'ok', ic: 'task_alt', t: 'ปกติ เยี่ยมตามรอบ', s: 'บันทึกผลงานและนัดเยี่ยมครั้งถัดไป' };
  }

  // claim readiness for this visit
  function readiness(R, v) {
    var h = R.h, x = R.x, items = [];
    var officer = S.role === 'officer';
    var has = function (k) { return h.dz.indexOf(k) > -1; };
    items.push({ s: v.verified ? (officer ? 'ok' : 'part') : 'no', n: 'ยืนยันตัวตนและปิดสิทธิ์ (Authen Code)', amt: 'เงื่อนไข',
      p: v.verified ? (officer ? 'Authen Code ' + v.authen : 'อ่านบัตรแล้ว — จนท. รพ.สต. ต้องปิดสิทธิ์เพื่อให้ได้ Authen Code') : 'ยังไม่ได้ยืนยันตัวตน' });
    items.push({ s: v.consent ? 'ok' : 'no', n: 'ผู้ป่วยยินยอมรับบริการ/ส่งข้อมูลให้แพทย์ทางไกล', amt: 'เงื่อนไข', p: v.consent ? 'บันทึกความยินยอมแล้ว' : 'ต้องได้รับความยินยอมก่อน' });
    items.push({ s: x.sbp ? 'ok' : 'no', n: 'ผลงานบริการพื้นฐาน PP (วัดความดัน / เยี่ยมบ้าน)', amt: 'นับผลงาน', p: x.sbp ? 'นับเป็นผลงาน 35% ของงบเหมาจ่าย เมื่อ จนท. บันทึกเข้า HIS' : 'ยังไม่ได้วัดความดัน' });

    if (has('HT') || has('DM') || has('COPD')) {
      var sent = !!v.consulted;
      items.push({ s: sent ? 'ok' : 'part', n: 'Telemedicine ติดตามโรคเรื้อรัง (Tele-F/U)', amt: '50 ฿',
        p: sent ? 'ส่งเข้าคิวแพทย์แล้ว เบิกได้เมื่อแพทย์ให้บริการด้วยภาพและเสียงครบ' : (h.appt ? 'มีนัดเดิมกับหน่วยบริการ เข้าเงื่อนไข — กด "ส่งปรึกษาแพทย์ทางไกล"' : 'ต้องมีนัดเดิมกับหน่วยบริการก่อน') });
      items.push({ s: sent ? 'part' : 'na', n: 'ค่าจัดส่งยาทางไปรษณีย์', amt: '50 ฿', p: 'เบิกได้เมื่อเภสัชกรจัดส่งยาและบันทึกหลักฐานการส่ง' });
    }
    if (has('DM')) items.push({ s: 'no', n: 'HbA1c ผู้ป่วยเบาหวานชนิดที่ 2', amt: '150 ฿', p: 'ยังไม่มีผลใน 3 เดือนล่าสุด — นัดเจาะเลือด (≤ 2 ครั้ง/ปี)' });
    if (!has('DM') && h.age >= 35 && h.age <= 59) items.push({ s: 'no', n: 'คัดกรองเบาหวาน FPG (อายุ 35–59 ปี)', amt: '40 ฿', p: 'DTX ปลายนิ้วเป็นการคัดกรองเบื้องต้น รายการที่จ่ายคือ FPG — นัดเจาะที่ รพ.สต.' });
    if (h.age >= 45 && h.age <= 70) items.push({ s: 'no', n: 'คัดกรองไขมัน TC + HDL (อายุ 45–70 ปี)', amt: '160 ฿', p: 'ทุก 5 ปี — นัดเจาะพร้อม FPG/HbA1c' });
    if (!has('HT') && x.sbp && (x.sbp >= 140 || x.dbp >= 90)) items.push({ s: 'na', n: 'Creatinine + Potassium ผู้ป่วยความดันรายใหม่', amt: '85 ฿', p: 'เบิกได้หลังแพทย์วินิจฉัยความดันรายใหม่' });
    if (has('BED')) items.push({ s: 'part', n: 'ดูแลผู้สูงอายุที่มีภาวะพึ่งพิง (LTC)', amt: 'Care Plan', p: 'ADL 6 ≤ 11 เข้าเกณฑ์ — แจ้ง Care Manager ทบทวน Care Plan' });

    var cnt = items.filter(function (i) { return i.s !== 'na'; });
    var ok = cnt.filter(function (i) { return i.s === 'ok'; }).length;
    return { items: items, pct: cnt.length ? Math.round(ok / cnt.length * 100) : 0, ok: ok, total: cnt.length };
  }

  /* ================= screens ================= */
  function setCta(html) { if (html) { cta.innerHTML = html; cta.hidden = false; screen.classList.add('pad-cta'); } else { cta.hidden = true; cta.innerHTML = ''; screen.classList.remove('pad-cta'); } }
  function setNav(on) {
    nav.hidden = !on;
    phone.classList.toggle('with-nav', !!on);
    phone.setAttribute('data-view', S.s);
    nav.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-current', b.getAttribute('data-tab') === S.tab ? 'page' : 'false'); });
  }

  function render() {
    var fn = { login: vLogin, home: vHome, devices: vDevices, claims: vClaims, visit: vVisit }[S.s];
    fn();
    screen.scrollTop = 0;
  }

  function vLogin() {
    setNav(false); setCta('');
    var r = ROLES[S.role];
    screen.innerHTML =
      '<div class="login">' +
        '<img class="logo-img" src="' + (window.DA_LOGO || 'assets/dr-assist-logo.webp') + '" alt="Dr.Assist" width="200" height="170">' +
        '<h1>เยี่ยมบ้าน</h1>' +
        '<p>สำหรับ อสม. และเจ้าหน้าที่ รพ.สต.</p>' +
        '<div class="seg" role="group" aria-label="เลือกบทบาท">' +
          '<button type="button" data-role="vhv" aria-pressed="' + (S.role === 'vhv') + '">' + ms('volunteer_activism') + 'อสม.<small>วัดค่า ประเมิน ส่งต่อ</small></button>' +
          '<button type="button" data-role="officer" aria-pressed="' + (S.role === 'officer') + '">' + ms('badge') + 'นักวิชาการ<br>สาธารณสุข<small>ปิดสิทธิ์ บันทึก ส่งเบิก</small></button>' +
        '</div>' +
        '<button type="button" class="pid" data-go="enter"><i>' + r.badge + ' <b>iD</b></i>' + esc(r.login) + '</button>' +
        '<span class="ver">Version 1.0.0</span>' +
      '</div>';
    screen.style.padding = '0';
  }

  function vHome() {
    screen.style.padding = '';
    setNav(true); setCta('');
    var r = ROLES[S.role];
    var list = D.HOMES.slice().sort(function (a, b) {
      var o = { high: 0, mid: 1, low: 2 };
      return (S.done[a.id] ? 3 : o[a.pri]) - (S.done[b.id] ? 3 : o[b.pri]);
    });
    var urgent = D.HOMES.filter(function (h) { return h.pri === 'high' && !S.done[h.id]; }).length;
    var doneN = Object.keys(S.done).length;
    var html =
      '<div class="top"><h1>เยี่ยมบ้านวันนี้</h1><button type="button" class="iconbtn" data-go="logout" aria-label="ออกจากระบบ">' + ms('logout') + '</button></div>' +
      '<div class="who">' + ms(S.role === 'vhv' ? 'volunteer_activism' : 'badge') + '<div><b>' + esc(r.who) + '</b><span>' + esc(r.where) + '</span></div></div>' +
      '<div class="sum"><div><b>' + D.HOMES.length + '</b><span>ต้องเยี่ยม</span></div><div><b style="color:var(--bad)">' + urgent + '</b><span>เร่งด่วน</span></div><div><b style="color:var(--ok)">' + doneN + '</b><span>เยี่ยมแล้ว</span></div></div>' +
      '<h2 class="sec">รายชื่อเรียงตามความเร่งด่วน</h2><div class="homes">';
    list.forEach(function (h) {
      var d = S.done[h.id];
      var pri = d ? 'done' : h.pri;
      var priTag = d ? '<span class="tag ok">' + ms('check') + 'เยี่ยมแล้ว · ' + esc(d.result) + '</span>'
        : h.pri === 'high' ? '<span class="tag bad">เร่งด่วน</span>' : h.pri === 'mid' ? '<span class="tag warn">ติดตามใกล้ชิด</span>' : '<span class="tag info">ตามรอบ</span>';
      html += '<button type="button" class="home ' + pri + '" data-visit="' + h.id + '">' +
        '<span class="nm">' + esc(h.name) + '</span><span class="meta">' + h.age + ' ปี · ' + esc(h.dist) + '</span>' +
        '<span class="dz">' + esc(h.dzText) + '</span>' +
        '<span class="why">' + priTag + '<span class="tag mute">' + esc(h.why) + '</span></span>' +
      '</button>';
    });
    html += '</div><p class="note">ข้อมูลผู้ป่วยทั้งหมดเป็นข้อมูลจำลองสำหรับต้นแบบ</p>';
    screen.innerHTML = html;
  }

  /* ---------- visit ---------- */
  var STEPS = ['ยืนยันตัวตน', 'วัดค่าด้วยอุปกรณ์', 'ประเมินเพิ่มเติม', 'ผลวิเคราะห์'];

  function startVisit(id) {
    S.v = { id: id, step: 0, verified: false, authen: '', consent: false, m: {}, fasting: true, a: { meds: null, q2: false, fall: false, wound: false, redflag: false }, consulted: false };
    S.s = 'visit'; render();
  }

  function vVisit() {
    screen.style.padding = '';
    setNav(false);
    var v = S.v, h = home(v.id);
    var head =
      '<div class="top"><button type="button" class="iconbtn" data-go="back" aria-label="ย้อนกลับ">' + ms('arrow_back') + '</button><h1>' + esc(h.name) + '</h1></div>' +
      '<div class="steps" aria-hidden="true">' + STEPS.map(function (_, i) { return '<i class="' + (i <= v.step ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<p class="steplabel">ขั้นที่ ' + (v.step + 1) + ' จาก 4 · ' + STEPS[v.step] + '</p>';
    screen.innerHTML = head + [stepId, stepMeasure, stepAssess, stepResult][v.step](v, h);
  }

  function stepId(v, h) {
    var canNext = v.verified && v.consent;
    setCta('<button type="button" class="btn solid" data-go="next"' + (canNext ? '' : ' disabled') + '>ถัดไป: วัดค่า</button>');
    return '<div class="cols">' +
      '<div class="card"><h3>' + ms('person') + 'ข้อมูลผู้รับการเยี่ยม</h3>' +
        '<dl class="kv"><dt>อายุ / เพศ</dt><dd>' + h.age + ' ปี · ' + h.sex + '</dd><dt>ที่อยู่</dt><dd>' + esc(h.moo) + '</dd><dt>โรคประจำตัว</dt><dd>' + esc(h.dzText) + '</dd><dt>เยี่ยมครั้งก่อน</dt><dd>' + esc(h.last) + '</dd></dl></div>' +
      (v.verified
        ? '<div class="card"><h3>' + ms('verified_user') + 'ยืนยันตัวตนแล้ว</h3><dl class="kv"><dt>เลขบัตร</dt><dd>' + esc(h.cid) + '</dd><dt>สิทธิ</dt><dd>' + esc(h.right) + '</dd><dt>หน่วยบริการหลัก</dt><dd>' + esc(h.unit) + '</dd>' +
            (S.role === 'officer' ? '<dt>Authen Code</dt><dd>' + esc(v.authen) + '</dd>' : '<dt>ปิดสิทธิ์</dt><dd style="color:var(--warn)">รอ จนท. รพ.สต.</dd>') + '</dl></div>'
        : '<div class="card"><h3>' + ms('id_card') + 'ยืนยันตัวตนผู้ป่วย</h3><p>ใช้บัตรประชาชนกับเครื่องอ่านบัตร หรือให้ผู้ป่วยยืนยันตัวตนด้วย Health ID ' + (S.role === 'officer' ? 'ระบบจะตรวจสิทธิและปิดสิทธิ์ให้ (ได้ Authen Code ใช้เบิก)' : 'ระบบจะตรวจสิทธิ ส่วนการปิดสิทธิ์ทำโดย จนท. รพ.สต.') + '</p>' +
            '<div style="margin-top:12px"><button type="button" class="btn" data-go="verify">' + ms('contactless') + 'อ่านบัตร / ยืนยันด้วย Health ID</button></div></div>') +
      '</div><div class="card"><label class="check"><input type="checkbox" data-consent' + (v.consent ? ' checked' : '') + '><span>ผู้ป่วยหรือญาติยินยอมให้บันทึกข้อมูลสุขภาพ และส่งต่อให้แพทย์ปรึกษาทางไกล<small>เป็นเงื่อนไขการเบิกบริการ Telemedicine</small></span></label></div>';
  }

  function meas(id, icon, title, inner, unitNote) {
    return '<section class="meas" aria-label="' + esc(title) + '"><div class="meas-h">' + ms(icon) + '<b>' + esc(title) + '</b>' +
      '<button type="button" class="bt" data-bt="' + id + '">' + ms('bluetooth') + 'รับค่าจากเครื่อง</button></div>' + inner + (unitNote || '') + '</section>';
  }
  function fld(k, label, unit, v) {
    return '<div class="f"><label for="m-' + k + '">' + esc(label) + '</label><input id="m-' + k + '" inputmode="decimal" autocomplete="off" data-m="' + k + '" value="' + esc(v.m[k] || '') + '"><div class="unit">' + esc(unit) + '</div></div>';
  }

  function stepMeasure(v, h) {
    setCta('<button type="button" class="btn solid" data-go="next">ถัดไป: ประเมินเพิ่มเติม</button>');
    var x = measures(v);
    var bpRead = x.sbp ? '<div class="readout">ค่าเฉลี่ย <b>' + x.sbp + '/' + x.dbp + '</b> mmHg</div>' : '';
    var bmiRead = x.bmi ? '<div class="readout">BMI <b>' + x.bmi.toFixed(1) + '</b></div>' : '';
    return '' +
      '<button type="button" class="btn ghost" data-bt="all" style="margin-bottom:12px">' + ms('bluetooth_connected') + 'รับค่าจากทุกเครื่อง (จำลอง)</button>' +
      '<div class="measgrid">' + meas('bp', 'blood_pressure', 'ความดันโลหิต (วัด 2 ครั้ง ห่างกัน 1 นาที)',
        '<div class="fields">' + fld('sbp1', 'ครั้งที่ 1 ตัวบน', 'mmHg', v) + fld('dbp1', 'ครั้งที่ 1 ตัวล่าง', 'mmHg', v) + fld('sbp2', 'ครั้งที่ 2 ตัวบน', 'mmHg', v) + fld('dbp2', 'ครั้งที่ 2 ตัวล่าง', 'mmHg', v) + '</div>' +
        '<div class="fields one" style="margin-top:10px">' + fld('hr', 'ชีพจร', 'ครั้ง/นาที', v) + '</div>' + bpRead) +
      meas('dtx', 'glucose', 'น้ำตาลปลายนิ้ว (DTX)',
        '<div class="fields one">' + fld('dtx', 'ระดับน้ำตาล', 'mg/dL', v) + '</div>' +
        '<div class="toggle" role="group" aria-label="สถานะการงดอาหาร"><button type="button" data-fast="1" aria-pressed="' + v.fasting + '">งดอาหาร 8 ชม.</button><button type="button" data-fast="0" aria-pressed="' + !v.fasting + '">หลังอาหาร / สุ่ม</button></div>') +
      meas('spo2', 'spo2', 'ออกซิเจนปลายนิ้ว', '<div class="fields one">' + fld('o2', 'SpO₂', '%', v) + '</div>') +
      meas('temp', 'thermostat', 'อุณหภูมิร่างกาย', '<div class="fields one">' + fld('temp', 'อุณหภูมิ', '°C', v) + '</div>') +
      meas('body', 'monitor_weight', 'น้ำหนัก ส่วนสูง รอบเอว',
        '<div class="fields three">' + fld('wt', 'น้ำหนัก', 'กก.', v) + fld('ht', 'ส่วนสูง', 'ซม.', v) + fld('waist', 'รอบเอว', 'ซม.', v) + '</div>' + bmiRead) + '</div>' +
      '<p class="note">ช่องที่ไม่มีเครื่องวัด เว้นว่างได้ ระบบจะวิเคราะห์เฉพาะค่าที่วัด</p>';
  }

  function stepAssess(v, h) {
    setCta('<button type="button" class="btn solid" data-go="next">ดูผลวิเคราะห์</button>');
    var chronic = h.dz.length > 0, elder = h.age >= 60;
    var c = function (k, label, small, checked) { return '<label class="check"><input type="checkbox" data-a="' + k + '"' + (checked ? ' checked' : '') + '><span>' + label + (small ? '<small>' + small + '</small>' : '') + '</span></label>'; };
    var html = '<div class="cols">' + '<div class="card"><h3>' + ms('emergency') + 'อาการเตือนอันตราย</h3>' +
      c('redflag', 'มีอาการใดอาการหนึ่งต่อไปนี้', 'เจ็บแน่นหน้าอก · ปวดหัวรุนแรงทันที · ปากเบี้ยว แขนขาอ่อนแรง พูดไม่ชัด · หอบเหนื่อยพูดไม่เป็นประโยค · ซึม สับสน', v.a.redflag) + '</div>';
    if (chronic) html += '<div class="card"><h3>' + ms('medication') + 'การใช้ยา</h3>' +
      '<div class="toggle" role="group" aria-label="กินยาครบหรือไม่"><button type="button" data-meds="1" aria-pressed="' + (v.a.meds === true) + '">กินยาครบตามสั่ง</button><button type="button" data-meds="0" aria-pressed="' + (v.a.meds === false) + '">ลืม / ไม่กินบางมื้อ</button></div></div>';
    if (elder) html += '<div class="card"><h3>' + ms('elderly') + 'คัดกรองผู้สูงอายุ</h3>' +
      c('q2', 'ซึมเศร้า (2Q): ใน 2 สัปดาห์ที่ผ่านมา รู้สึกหดหู่ เศร้า ท้อแท้ หรือเบื่อ ไม่เพลิดเพลินกับสิ่งที่ทำ', 'ติ๊กถ้าตอบ "ใช่" อย่างน้อย 1 ข้อ', v.a.q2) +
      c('fall', 'หกล้มอย่างน้อย 1 ครั้งใน 6 เดือนที่ผ่านมา', '', v.a.fall) + '</div>';
    if (h.dz.indexOf('DM') > -1 || h.dz.indexOf('BED') > -1) html += '<div class="card"><h3>' + ms('healing') + 'ผิวหนังและแผล</h3>' +
      c('wound', h.dz.indexOf('BED') > -1 ? 'พบแผลกดทับหรือผิวแดงไม่จางเมื่อกด' : 'พบแผล ชา หรือสีผิวผิดปกติที่เท้า', 'ถ่ายภาพแผลแนบในขั้นถัดไป', v.a.wound) + '</div>';
    return html + '</div>';
  }

  function stepResult(v, h) {
    var R = analyse(v), dsp = disposition(R, v), rd = readiness(R, v);
    var officer = S.role === 'officer';
    var html = '<div class="find ' + dsp.lv + '" style="border-width:3px">' + ms(dsp.ic) + '<b>' + esc(dsp.t) + '</b><span class="a">' + esc(dsp.s) + '</span></div>';

    html += '<div class="res"><div class="col"><h2 class="sec">สิ่งที่พบ</h2>';
    if (!R.f.length) html += '<p class="lead">ยังไม่มีค่าที่วัด ย้อนกลับไปวัดค่าอย่างน้อย 1 รายการ</p>';
    R.f.forEach(function (f) {
      html += '<div class="find ' + f.lv + '">' + ms(f.ic) + '<b>' + esc(f.t) + (f.icd ? '<span class="icd">' + esc(f.icd) + '</span>' : '') + '</b>' +
        (f.val ? '<span class="v">' + esc(f.val) + '</span>' : '') + (f.act ? '<span class="a">' + esc(f.act) + '</span>' : '') + '</div>';
    });
    if (R.f.some(function (f) { return f.icd; })) html += '<p class="note">รหัส ICD-10 เป็นข้อเสนอให้แพทย์พิจารณา อสม./จนท. ไม่ได้เป็นผู้วินิจฉัย</p>';

    html += '</div><div class="col">';
    // what the devices used today can and cannot tell
    var used = {}; R.f.forEach(function (f) { if (f.dev) used[f.dev] = 1; });
    var devs = D.DEVICES.filter(function (d) { return used[d.id]; });
    if (devs.length) {
      html += '<h2 class="sec">อุปกรณ์ที่ใช้วันนี้ บอกอะไรได้</h2>';
      devs.forEach(function (d) {
        var tg = d.level === 'diagnose' ? '<span class="tag ok">วินิจฉัยได้</span>' : d.level === 'screen' ? '<span class="tag warn">คัดกรอง/ติดตาม</span>' : '<span class="tag info">ประเมินความรุนแรง</span>';
        html += '<div class="cl"><b>' + esc(d.name) + '</b>' + tg + '<p>' + esc(d.dz.map(function (z) { return z.n; }).join(' · ')) + '</p><p><b style="font-size:13.5px">ต้องยืนยันด้วย:</b> ' + esc(d.confirm) + '</p></div>';
      });
    }

    html += '<h2 class="sec">ความพร้อมเบิกจ่ายของการเยี่ยมครั้งนี้</h2>' +
      '<div class="ready"><div class="ring" style="--p:' + rd.pct + '"><span>' + rd.pct + '%</span></div><div><b>พร้อม ' + rd.ok + ' จาก ' + rd.total + ' รายการ</b><small>รายการที่ยังไม่พร้อมคือเงินที่หน่วยบริการยังเบิกไม่ได้</small></div></div>' +
      '<div class="card" style="padding:4px 16px">';
    var icon = { ok: 'check_circle', part: 'pending', no: 'cancel', na: 'remove_circle_outline' };
    rd.items.forEach(function (i) {
      html += '<div class="ci ' + i.s + '">' + ms(icon[i.s]) + '<b>' + esc(i.n) + '</b><span class="amt">' + esc(i.amt) + '</span><p>' + esc(i.p) + '</p></div>';
    });
    html += '</div><p class="note">อัตราอ้างอิงจากเอกสาร สปสช. ในแท็บ "เบิกจ่าย" ตรวจสอบกับประกาศฉบับปีปัจจุบันก่อนใช้งานจริง</p></div></div>';

    var consultBtn = (h.dz.length || dsp.lv === 'bad' || dsp.lv === 'warn') && !v.consulted
      ? '<button type="button" class="btn' + (dsp.lv === 'bad' ? ' solid' : '') + '" data-go="consult">' + ms('video_call') + 'ส่งปรึกษาแพทย์ทางไกล</button>' : '';
    if (v.consulted) consultBtn = '<button type="button" class="btn" disabled>' + ms('check') + 'ส่งเข้าคิวแพทย์แล้ว</button>';
    setCta(consultBtn + '<button type="button" class="btn green" data-go="save">' + ms(officer ? 'cloud_upload' : 'send') + (officer ? 'บันทึกเข้า HIS และส่งเบิก (FDH)' : 'ส่งผลให้ จนท. รพ.สต.') + '</button>');
    if (consultBtn) screen.classList.add('pad-cta');
    return html + '<div style="height:' + (consultBtn ? 66 : 0) + 'px"></div>';
  }

  /* ---------- device guide ---------- */
  function vDevices() {
    screen.style.padding = '';
    setNav(true); setCta('');
    var html = '<div class="top"><h1>อุปกรณ์กับโรคที่วินิจฉัยได้</h1></div>' +
      '<p class="lead">อุปกรณ์แต่ละชิ้นตอบคำถามได้ไม่เท่ากัน บางชิ้นวินิจฉัยได้ทันที บางชิ้นใช้คัดกรองแล้วต้องยืนยันด้วยแล็บ แตะแต่ละรายการเพื่อดูเกณฑ์และสิ่งที่เบิกได้</p>' +
      '<div class="legend"><span class="tag ok">วินิจฉัยได้</span><span class="tag warn">คัดกรอง/ติดตาม</span><span class="tag info">ประเมินความรุนแรง</span></div>';
    var group = function (title, arr) {
      html += '<h2 class="sec">' + title + '</h2><div class="devgrid">';
      arr.forEach(function (d) {
        var open = !!S.open[d.id];
        var tg = d.level === 'diagnose' ? 'ok' : d.level === 'screen' ? 'warn' : 'info';
        var st = d.have ? '' : d.id === 'dtx' ? ' · <span style="color:var(--pri)">เพิ่มในบทบาทเยี่ยมบ้าน</span>' : '';
        html += '<div class="dev' + (d.recommend ? ' missing' : '') + '"><button type="button" data-dev="' + d.id + '" aria-expanded="' + open + '">' +
          ms(d.icon, 'big') + '<b>' + esc(d.name) + '</b>' + ms(open ? 'expand_less' : 'expand_more') +
          '<span class="l"><span class="tag ' + tg + '">' + esc(d.levelText) + '</span>' + st + '</span></button>';
        if (open) {
          html += '<div class="body"><p class="lead" style="margin:0 0 4px;font-size:15px">วัด: ' + esc(d.reads) + '</p>';
          d.dz.forEach(function (z) { html += '<div class="dz"><b>' + esc(z.n) + (z.icd ? '<span class="icd" style="background:var(--soft)">' + esc(z.icd) + '</span>' : '') + '</b><p>' + esc(z.how) + '</p></div>'; });
          if (d.alarm && d.alarm !== '—') html += '<div class="box bad"><b>ส่งต่อทันทีเมื่อ</b>' + esc(d.alarm) + '</div>';
          html += '<div class="box info"><b>ต้องยืนยันด้วย</b>' + esc(d.confirm) + '</div>';
          html += '<div class="box ok"><b>เกี่ยวกับการเบิกจ่าย</b>' + esc(d.claim) + '</div>';
          if (d.note) html += '<p class="note" style="margin-top:8px">' + esc(d.note) + '</p>';
          html += '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
    };
    group('ใช้อยู่ในระบบ', D.DEVICES.filter(function (d) { return !d.recommend; }));
    group('แนะนำให้เพิ่ม', D.DEVICES.filter(function (d) { return d.recommend; }));
    screen.innerHTML = html;
  }

  /* ---------- claim gaps ---------- */
  function vClaims() {
    screen.style.padding = '';
    setNav(true); setCta('');
    var G = D.GAPS;
    var c = function (s) { return G.filter(function (g) { return g.s === s; }).length; };
    var icon = { ok: 'check_circle', part: 'pending', no: 'cancel', added: 'add_circle' };
    var lbl = { ok: 'มีแล้ว', part: 'มีบางส่วน', no: 'ยังไม่มี', added: 'เพิ่มแล้วในบทบาทนี้' };
    var html = '<div class="top"><h1>เบิกจ่าย</h1></div>' +
      '<p class="lead">Doctor Assist ยังขาดข้อมูลอะไรจึงจะเบิกเงินได้ครบ และแต่ละรายการเบิกได้เท่าไร</p>' +
      '<div class="sum"><div><b style="color:var(--ok)">' + c('ok') + '</b><span>มีแล้ว</span></div><div><b style="color:var(--warn)">' + c('part') + '</b><span>มีบางส่วน</span></div><div><b style="color:var(--bad)">' + c('no') + '</b><span>ยังไม่มี</span></div></div>' +
      '<div class="res"><div class="col"><h2 class="sec">ข้อมูลที่ต้องมีเพื่อเบิก</h2><div class="card" style="padding:4px 16px">';
    var order = { no: 0, part: 1, added: 2, ok: 3 };
    G.slice().sort(function (a, b) { return order[a.s] - order[b.s]; }).forEach(function (g) {
      html += '<div class="ci ' + g.s + '">' + ms(icon[g.s]) + '<b>' + esc(g.n) + '</b><span class="tag ' + (g.s === 'ok' ? 'ok' : g.s === 'part' ? 'warn' : g.s === 'no' ? 'bad' : 'info') + '">' + lbl[g.s] + '</span>' +
        '<p>' + (g.d ? esc(g.d) + ' · ' : '') + 'บทบาท: ' + esc(g.where) + '</p></div>';
    });
    html += '</div></div><div class="col">';

    html += '<h2 class="sec">รายการที่เบิกได้</h2>';
    D.CLAIMS.forEach(function (grp) {
      html += '<h3 class="claimg">' + esc(grp.g) + '</h3>';
      grp.items.forEach(function (i) {
        html += '<div class="cl' + (i.ended ? ' ended' : '') + '"><b>' + esc(i.n) + '</b><span class="r">' + esc(i.r) + '</span><p>' + esc(i.w) +
          (i.src ? ' · <a class="src" href="' + esc(D.SOURCES[i.src].u) + '" target="_blank" rel="noopener">แหล่งอ้างอิง</a>' : '') + '</p></div>';
      });
    });
    html += '<p class="note">อัตราจากเอกสารอ้างอิงด้านล่าง บางฉบับเป็นของปีก่อน ตรวจสอบกับประกาศ สปสช./สปส. ฉบับปีปัจจุบันก่อนใช้งานจริง</p><ul class="srcs">';
    Object.keys(D.SOURCES).forEach(function (k) { html += '<li><a class="src" href="' + esc(D.SOURCES[k].u) + '" target="_blank" rel="noopener">' + esc(D.SOURCES[k].t) + '</a></li>'; });
    screen.innerHTML = html + '</ul></div></div>';
  }

  /* ================= actions ================= */
  function demoFill(id) {
    var h = home(S.v.id), d = h.demo, m = S.v.m;
    var map = { bp: ['sbp1', 'dbp1', 'sbp2', 'dbp2', 'hr'], dtx: ['dtx'], spo2: ['o2'], temp: ['temp'], body: ['wt', 'ht', 'waist'] };
    var keys = id === 'all' ? [].concat(map.bp, map.dtx, map.spo2, map.temp, map.body) : map[id];
    keys.forEach(function (k) { if (d[k]) m[k] = String(d[k]); });
    if (id === 'all' || id === 'dtx') S.v.fasting = !!d.fasting;
    render();
    toast(id === 'all' ? 'รับค่าจากเครื่องครบแล้ว' : 'รับค่าจากเครื่องแล้ว');
  }

  function consult() {
    var v = S.v, h = home(v.id), R = analyse(v), x = R.x;
    var found = R.f.filter(function (f) { return f.lv === 'bad' || f.lv === 'warn'; }).map(function (f) { return f.t; }).join(' · ');
    var vit = 'BP ' + (x.sbp ? x.sbp + '/' + x.dbp : '–') + ' · HR ' + (x.hr || '–') + ' · T ' + (x.temp || '–') + ' · SpO2 ' + (x.o2 || '–') + ' · RR – · Wt ' + (x.wt || '–') + ' · Ht ' + (x.ht || '–') + ' · BMI ' + (x.bmi ? x.bmi.toFixed(1) : '–') + (x.dtx ? ' · DTX ' + x.dtx : '');
    try {
      localStorage.setItem('da-booking', JSON.stringify({
        booked: true, confirmed: false, name: h.name, date: 26, time: '11:00',
        chips: 'ส่งต่อจากการเยี่ยมบ้าน (' + ROLES[S.role].label + ')', symptom: found || 'ติดตามโรคเรื้อรัง',
        right: h.right, cert: false, vitals: vit
      }));
    } catch (e) {}
    v.consulted = true; render();
    toast('ส่งเข้าคิวพยาบาลแล้ว ดูได้ที่บทบาท "พยาบาล"');
  }

  function save() {
    var v = S.v, R = analyse(v), dsp = disposition(R, v);
    S.done[v.id] = { result: dsp.lv === 'ok' ? 'ปกติ' : dsp.lv === 'bad' ? 'ส่งต่อ/ปรึกษาแพทย์' : 'นัดติดตาม' };
    saveDone();
    S.s = 'home'; S.tab = 'home'; S.v = null; render();
    toast(S.role === 'officer' ? 'บันทึกและส่งข้อมูลเบิกแล้ว (จำลอง)' : 'ส่งผลให้ จนท. รพ.สต. แล้ว');
  }

  /* ================= events ================= */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t || t.disabled) return;
    var go = t.getAttribute('data-go');
    if (t.hasAttribute('data-role')) { S.role = t.getAttribute('data-role'); render(); return; }
    if (t.hasAttribute('data-tab')) { S.tab = t.getAttribute('data-tab'); S.s = S.tab; render(); return; }
    if (t.hasAttribute('data-visit')) { startVisit(t.getAttribute('data-visit')); return; }
    if (t.hasAttribute('data-dev')) { var id = t.getAttribute('data-dev'); S.open[id] = !S.open[id]; var y = screen.scrollTop; render(); screen.scrollTop = y; return; }
    if (t.hasAttribute('data-bt')) { var y2 = screen.scrollTop; demoFill(t.getAttribute('data-bt')); screen.scrollTop = y2; return; }
    if (t.hasAttribute('data-fast')) { S.v.fasting = t.getAttribute('data-fast') === '1'; var y3 = screen.scrollTop; render(); screen.scrollTop = y3; return; }
    if (t.hasAttribute('data-meds')) { S.v.a.meds = t.getAttribute('data-meds') === '1'; var y4 = screen.scrollTop; render(); screen.scrollTop = y4; return; }
    switch (go) {
      case 'enter': S.s = 'home'; S.tab = 'home'; render(); break;
      case 'logout': S.s = 'login'; render(); break;
      case 'back':
        if (S.v.step > 0) { S.v.step--; render(); } else { S.s = 'home'; S.v = null; render(); }
        break;
      case 'next': S.v.step = Math.min(3, S.v.step + 1); render(); break;
      case 'verify':
        S.v.verified = true;
        if (S.role === 'officer') S.v.authen = 'PP' + String(Math.floor(1e7 + Math.random() * 9e7));
        render(); toast('ยืนยันตัวตนและตรวจสิทธิแล้ว'); break;
      case 'consult': consult(); break;
      case 'save': save(); break;
    }
  });

  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.hasAttribute('data-m')) {
      el.value = el.value.replace(/[^0-9.]/g, '');
      S.v.m[el.getAttribute('data-m')] = el.value;
      // refresh the small read-outs without re-rendering (keeps focus)
      var x = measures(S.v);
      var bp = document.querySelector('[aria-label^="ความดันโลหิต"] .readout');
      if (bp) bp.innerHTML = x.sbp ? 'ค่าเฉลี่ย <b>' + x.sbp + '/' + x.dbp + '</b> mmHg' : '';
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.hasAttribute('data-consent')) { S.v.consent = el.checked; var y = screen.scrollTop; render(); screen.scrollTop = y; }
    if (el.hasAttribute('data-a')) { S.v.a[el.getAttribute('data-a')] = el.checked; if (el.getAttribute('data-a') === 'redflag') S.v.a.redflagText = el.checked ? 'อสม./จนท. พบอาการเตือนระหว่างเยี่ยม' : ''; }
  });

  render();
})();

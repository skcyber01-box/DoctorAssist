(function () {
  var st = document.createElement('style');
  st.textContent = 'body.fs-on nav{display:none !important}body.fs-on div[style*="390px"][style*="844px"]{position:fixed !important;left:0;top:0;width:100vw !important;height:100dvh !important;max-width:none !important;border:0 !important;border-radius:0 !important;box-shadow:none !important;z-index:9998}';
  document.head.appendChild(st);
  var inBtn, outBtn;
  function mk(icon, label, css) {
    var b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', label);
    b.innerHTML = '<span class="ms" style="font-family:\'Material Symbols Rounded\';font-size:24px;line-height:1">' + icon + '</span>' + (css.txt ? '<span style="font:600 14px \'IBM Plex Sans Thai\',sans-serif;margin-left:4px">' + label + '</span>' : '');
    b.style.cssText = css.s; return b;
  }
  function setFs(on) {
    document.body.classList.toggle('fs-on', on);
    outBtn.style.display = on ? 'flex' : 'none';
    var el = document.documentElement;
    try {
      if (on && el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(function () {});
      if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    } catch (e) {}
  }
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && document.body.classList.contains('fs-on')) setFs(false); });
  function init() {
    if (!document.body) return;
    outBtn = mk('close_fullscreen', 'ย่อ', { s: 'position:fixed;right:8px;top:3px;z-index:99999;width:30px;height:30px;border:0;border-radius:50%;background:rgba(27,35,40,.55);color:#fff;display:none;align-items:center;justify-content:center;padding:0;cursor:pointer' });
    outBtn.querySelector('.ms').style.fontSize = '20px';
    outBtn.onclick = function () { setFs(false); };
    document.body.appendChild(outBtn);
    setInterval(function () {
      var nav = document.querySelector('nav');
      if (nav && !nav.querySelector('[data-fs]')) {
        inBtn = mk('fullscreen', 'เต็มจอ', { txt: 1, s: 'margin-left:8px;height:40px;padding:0 14px;border:1px solid #4b5a64;border-radius:99px;background:#2f5fd0;color:#fff;display:flex;align-items:center;cursor:pointer' });
        inBtn.setAttribute('data-fs', '1'); inBtn.onclick = function () { setFs(true); };
        nav.appendChild(inBtn);
      }
    }, 400);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();

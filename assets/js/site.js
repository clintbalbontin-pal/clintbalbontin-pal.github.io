/* clintbalbontin.com shared script (v6, 2026-09-27) */
(function () {
  'use strict';
  var doc = document;

  /* ---------- Nav state ---------- */
  var nav = doc.getElementById('nav');
  if (nav && !nav.classList.contains('solid')) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 60); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile nav (accessible) ---------- */
  var menu = doc.getElementById('mobileNav');
  var openBtn = doc.querySelector('.hamburger');
  var closeBtn = doc.querySelector('.mobile-nav-close');
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
    if (openBtn) openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    doc.body.style.overflow = open ? 'hidden' : '';
    if (open && closeBtn) closeBtn.focus();
    else if (!open && openBtn) openBtn.focus();
  }
  if (menu) {
    menu.setAttribute('inert', '');
    if (openBtn) openBtn.addEventListener('click', function () { setMenu(true); });
    if (closeBtn) closeBtn.addEventListener('click', function () { setMenu(false); });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });
  }

  /* ---------- Scroll reveal ---------- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = doc.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Analytics helpers ---------- */
  function track(name, params) { if (typeof window.gtag === 'function') { try { window.gtag('event', name, params || {}); } catch (e) {} } }
  doc.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('mailto:') === 0) track('contact_email_click', { link_url: href });
    else if (href.indexOf('tel:') === 0) track('contact_phone_click', { link_url: href });
    else if (/linkedin\.com/i.test(href)) track('social_click', { platform: 'linkedin', link_url: href });
    else if (/behance\.net/i.test(href)) track('social_click', { platform: 'behance', link_url: href });
    if (a.hasAttribute('data-cta')) track('cta_click', { cta: a.getAttribute('data-cta'), page: location.pathname });
  }, true);

  /* ---------- Contact form ---------- */
  var form = doc.getElementById('contactForm');
  if (form) {
    form.setAttribute('novalidate', '');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = doc.getElementById('submitBtn');
      var status = doc.getElementById('formStatus');
      var invalid = null;
      form.querySelectorAll('[required]').forEach(function (f) {
        var bad = !f.value.trim() || (f.type === 'email' && !/^\S+@\S+\.\S+$/.test(f.value.trim()));
        f.setAttribute('aria-invalid', bad ? 'true' : 'false');
        if (bad && !invalid) invalid = f;
      });
      if (invalid) {
        status.className = 'f-status err';
        status.textContent = 'Please fill in your name, a valid email, and a short project note.';
        invalid.focus();
        return;
      }
      var original = btn.innerHTML;
      btn.textContent = 'Sending...';
      btn.disabled = true;
      status.className = 'f-status';
      status.textContent = '';
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('Form error');
          track('generate_lead', { method: 'contact_form' });
          status.className = 'f-status ok';
          status.textContent = 'Thanks. Your message is in. I reply within 24 hours.';
          form.reset();
          btn.textContent = 'Message sent';
          setTimeout(function () { btn.innerHTML = original; btn.disabled = false; }, 4000);
        })
        .catch(function () {
          btn.innerHTML = original;
          btn.disabled = false;
          status.className = 'f-status err';
          status.innerHTML = 'The message did not send. Please email me at <a href="mailto:clint@clintbalbontin.com">clint@clintbalbontin.com</a>.';
        });
    });
  }

  /* ---------- Work filter ---------- */
  var filters = doc.querySelectorAll('.filt');
  var showcase = doc.getElementById('workShowcase');
  var grid = doc.querySelector('.work-grid');
  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = btn.getAttribute('data-filter');
      filters.forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
      if (cat === 'all') {
        if (showcase) showcase.style.display = '';
        if (grid) grid.style.display = 'none';
      } else {
        if (showcase) showcase.style.display = 'none';
        if (grid) grid.style.display = '';
        doc.querySelectorAll('.work-cell').forEach(function (c) { c.style.display = (c.dataset.cat === cat) ? '' : 'none'; });
      }
      track('portfolio_filter', { category: cat });
    });
  });

  /* ---------- Lightbox ---------- */
  var lb = doc.getElementById('lightbox');
  var cells = Array.prototype.slice.call(doc.querySelectorAll('.work-cell'));
  if (lb && cells.length) {
    var lbImg = doc.getElementById('lbImg'), lbCat = doc.getElementById('lbCat'), lbTitle = doc.getElementById('lbTitle'), lbCount = doc.getElementById('lbCount');
    var flat = [], idx = 0, lastFocus = null;
    cells.forEach(function (c) {
      c.setAttribute('tabindex', '0');
      c.setAttribute('role', 'button');
      var t = c.querySelector('.work-title');
      c.setAttribute('aria-label', 'Open gallery: ' + (t ? t.textContent : 'project'));
      c.addEventListener('click', function () { openLb(c); });
      c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(c); } });
    });
    var buildFlat = function () {
      flat = [];
      var vis = cells.filter(function (c) { return c.offsetParent !== null; });
      if (!vis.length) vis = cells;
      vis.forEach(function (c) {
        var srcs = (c.getAttribute('data-gallery') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!srcs.length) { var im = c.querySelector('.work-bg img'); srcs = [im ? im.src : '']; }
        srcs.forEach(function (s, j) { flat.push({ cell: c, src: s, j: j, m: srcs.length }); });
      });
    };
    var render = function () {
      var it = flat[idx];
      lbImg.src = it.src;
      var im = it.cell.querySelector('.work-bg img');
      lbImg.alt = (im ? im.alt : '') + (it.m > 1 ? ' (image ' + (it.j + 1) + ' of ' + it.m + ')' : '');
      var cat = it.cell.querySelector('.work-cat'), ttl = it.cell.querySelector('.work-title');
      lbCat.textContent = cat ? cat.textContent : '';
      lbTitle.textContent = ttl ? ttl.textContent : '';
      var cs = it.cell.getAttribute('data-case');
      if (cs) { var l = doc.createElement('a'); l.className = 'lb-bh'; l.href = cs; l.textContent = 'Read the case study'; lbTitle.appendChild(l); }
      var bh = it.cell.getAttribute('data-behance');
      if (bh) { var b = doc.createElement('a'); b.className = 'lb-bh'; b.href = bh; b.target = '_blank'; b.rel = 'noopener'; b.textContent = 'View on Behance'; lbTitle.appendChild(b); }
      lbCount.textContent = it.m > 1 ? (it.j + 1) + ' / ' + it.m : '';
      if (lbImg.parentElement) lbImg.parentElement.scrollTop = 0;
      var nxt = flat[(idx + 1) % flat.length];
      if (nxt && nxt.src) { var pre = new Image(); pre.src = nxt.src; }
    };
    var onKey = function (e) {
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Tab') {
        var f = lb.querySelectorAll('button, a[href]');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    var openLb = function (cell) {
      buildFlat();
      idx = Math.max(0, flat.findIndex(function (f) { return f.cell === cell && f.j === 0; }));
      render();
      lastFocus = doc.activeElement;
      lb.hidden = false;
      requestAnimationFrame(function () { lb.classList.add('lb-open'); });
      doc.body.style.overflow = 'hidden';
      lb.querySelector('.lb-close').focus();
      doc.addEventListener('keydown', onKey);
      track('gallery_open', { project: (cell.querySelector('.work-title') || {}).textContent || '' });
    };
    var closeLb = function () {
      lb.classList.remove('lb-open');
      doc.body.style.overflow = '';
      doc.removeEventListener('keydown', onKey);
      setTimeout(function () { lb.hidden = true; if (lastFocus) lastFocus.focus(); }, 220);
    };
    var step = function (d) { idx = (idx + d + flat.length) % flat.length; render(); };
    lb.querySelectorAll('[data-lb-close]').forEach(function (el) { el.addEventListener('click', closeLb); });
    doc.getElementById('lbPrev').addEventListener('click', function () { step(-1); });
    doc.getElementById('lbNext').addEventListener('click', function () { step(1); });
  }

  /* ---------- Work showcase (All tab) ---------- */
  var stage = doc.getElementById('wsStage');
  if (stage && cells.length) {
    var wsImg = doc.getElementById('wsImg'), wsCat = doc.getElementById('wsCat'), wsTitle = doc.getElementById('wsTitle'), thumbs = doc.getElementById('wsThumbs');
    var cur = 0;
    var data = cells.map(function (c) {
      var t = c.querySelector('.work-bg img');
      return { cell: c, thumb: t ? t.getAttribute('src') : '', mini: t ? t.getAttribute('src').replace('/assets/img/', '/assets/thumbs/') : '', alt: t ? t.alt : '', cat: (c.querySelector('.work-cat') || {}).textContent || '', title: (c.querySelector('.work-title') || {}).textContent || '' };
    });
    data.forEach(function (d, i) {
      var b = doc.createElement('button');
      b.className = 'ws-thumb'; b.type = 'button';
      b.setAttribute('aria-label', 'Show ' + d.title);
      var im = doc.createElement('img');
      im.src = d.mini; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.width = 106; im.height = 74;
      b.appendChild(im);
      b.addEventListener('click', function () { select(i); });
      thumbs.appendChild(b);
    });
    var select = function (i) {
      cur = i;
      var d = data[i];
      wsImg.src = d.thumb;
      wsImg.alt = d.alt;
      wsCat.textContent = d.cat;
      wsTitle.textContent = d.title;
      thumbs.querySelectorAll('.ws-thumb').forEach(function (el, j) { if (j === i) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current'); });
    };
    stage.addEventListener('click', function () { data[cur].cell.click(); });
    stage.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); data[cur].cell.click(); } });
    if (grid) grid.style.display = 'none';
    select(0);
  }
})();

(function () {
  'use strict';

  /* ── ナビゲーション ───────────────────────── */
  var nav = document.getElementById('nav');
  var toggle = document.getElementById('navToggle');

  function onScroll() {
    nav.classList.toggle('is-stuck', window.scrollY > window.innerHeight * 0.7);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  toggle.addEventListener('click', function () {
    var open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('.nav__links a').forEach(function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  /* ── YouTube は押されたときだけ読み込む ───── */
  var video = document.querySelector('.video');
  if (video) {
    var btn = video.querySelector('.video__play');
    btn.addEventListener('click', function () {
      var id = video.dataset.youtube;
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0';
      f.title = '不揃いな靴に選ばれる';
      f.allow = 'accelerometer; autoplay; encrypted-media; picture-in-picture';
      f.allowFullscreen = true;
      video.innerHTML = '';
      video.appendChild(f);
    });
  }

  /* ── ページ内移動：対象がまるごと見える位置へ ── */
  var NAV_H = 78;
  /* セクションIDごとに「これが見えていてほしい」要素 */
  var FOCUS = { booklet: '#fb', film: '.video', concepts: null };

  function scrollToSection(id) {
    var sec = document.getElementById(id);
    if (!sec) return;
    var focusSel = FOCUS[id];
    var focus = focusSel ? sec.querySelector(focusSel) : null;
    var space = window.innerHeight - NAV_H;
    var secTop = sec.getBoundingClientRect().top + window.scrollY;
    var top = secTop - NAV_H - 8;

    if (focus) {
      var fRect = focus.getBoundingClientRect();
      var fBottom = fRect.top + window.scrollY + fRect.height;
      /* 下端が切れるぶんだけ下げる */
      var over = fBottom - (top + NAV_H + space) + 10;
      if (over > 0) top += over;
      /* ただし見出しが隠れるところまでは下げない */
      /* 狭い画面では見出しより、対象がまるごと見えることを優先する */
      var head = window.innerWidth > 640 ? sec.querySelector('.sechead') : null;
      if (head) {
        var cap = head.getBoundingClientRect().top + window.scrollY - NAV_H - 12;
        top = Math.min(top, cap);
      }
    }
    window.scrollTo({ top: Math.max(0, Math.round(top)), behavior: 'smooth' });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var id = a.getAttribute('href').slice(1);
    if (!id || !document.getElementById(id)) return;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      scrollToSection(id);
      history.replaceState(null, '', '#' + id);
    });
  });

  /* ── 「冊子のこのページを開く」 ───────────── */
  document.querySelectorAll('.jump').forEach(function (b) {
    b.addEventListener('click', function () {
      var n = parseInt(b.dataset.page, 10);
      scrollToSection('booklet');
      setTimeout(function () {
        if (window.flipbookGoTo) window.flipbookGoTo(n);
      }, 430);
    });
  });

  /* ── 足跡の帯をつくる（うねうね歩く） ────── */
  var SVGNS = 'http://www.w3.org/2000/svg';

  function buildTrail(el) {
    var w = el.clientWidth || 900;
    var n = Math.min(13, Math.max(6, Math.round(w / 112)));
    if (+el.dataset.built === n) { placeTrail(el); return; }
    el.dataset.built = n;
    el.textContent = '';
    for (var i = 0; i < n; i++) {
      var svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('class', 'fp ' + (i % 2 ? 'fp--orange' : 'fp--blue'));
      svg.setAttribute('viewBox', '0 0 60 92');
      var use = document.createElementNS(SVGNS, 'use');
      use.setAttribute('href', '#fp');
      svg.appendChild(use);
      el.appendChild(svg);
    }
    placeTrail(el);
  }

  /* 正弦波に沿って足跡を並べ、進行方向へ向きを合わせる */
  function placeTrail(el) {
    var kids = el.children, n = kids.length;
    if (!n) return;
    var w = el.clientWidth || 900;
    var h = el.clientHeight || 120;
    var amp   = Math.min(h * 0.3, 34);          // うねりの振幅
    var waves = +el.dataset.waves || 1.2;      // 波の数
    var step  = Math.min(12, h * 0.1);         // 左右の足の開き
    var x0 = 5, span = 90;                      // 左右の余白(%)

    for (var i = 0; i < n; i++) {
      var t = n > 1 ? i / (n - 1) : 0.5;
      var a = 2 * Math.PI * waves * t + 0.6;
      var y  = amp * Math.sin(a);
      var dy = amp * 2 * Math.PI * waves * Math.cos(a);
      var dx = (span / 100) * w;
      var rad = Math.atan2(dy, dx);
      var side = (i % 2) ? 1 : -1;              // 偶数=左足(青) 奇数=右足(橙)
      var ox = -Math.sin(rad) * step * side;
      var oy =  Math.cos(rad) * step * side;
      var deg = 90 + rad * 180 / Math.PI + side * 6;
      var s = kids[i].style;
      s.left = (x0 + span * t) + '%';
      s.top = '50%';
      s.transform = 'translate(-50%,-50%) translate(' + ox.toFixed(1) + 'px,'
                  + (y + oy).toFixed(1) + 'px) rotate(' + deg.toFixed(1) + 'deg)';
    }
  }

  var trails = Array.prototype.slice.call(document.querySelectorAll('.trail'));
  function refreshTrails() { trails.forEach(buildTrail); }
  refreshTrails();
  window.addEventListener('load', refreshTrails);
  var trt;
  window.addEventListener('resize', function () {
    clearTimeout(trt); trt = setTimeout(refreshTrails, 180);
  });

  /* ── スクロールに合わせて出現 ─────────────── */
  if ('IntersectionObserver' in window &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('.sechead, .card, .program li, .speakers li, .qbox, .pull')
      .forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }
})();

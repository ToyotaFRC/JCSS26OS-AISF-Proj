/* ══════════════════════════════════════════════════════════
   右綴じフリップブック（依存ライブラリなし）
   ・PC : 見開き2ページ。右ページが左へめくれる
   ・スマホ : 1ページずつ
   ══════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var root = document.getElementById('fb');
  if (!root) return;

  /* ── 設定 ─────────────────────────────────── */
  var TOTAL_PAGES = parseInt(root.dataset.total, 10) || 20;
  var SRC   = function (n) { return 'assets/booklet/page-' + pad(n) + '.jpg'; };
  var THUMB = function (n) { return 'assets/booklet/thumbs/thumb-' + pad(n) + '.jpg'; };
  var DURATION = 620;              // めくりアニメーションの長さ(ms)
  var SINGLE_BREAKPOINT = 560;     // これ以下は自動で1ページ表示

  /* 印刷されているノンブル（物理ページ番号 → 冊子上の表記） */
  var FOLIO = {
    1: '表紙', 2: '01', 3: '02', 4: '03', 5: '04', 6: '05', 7: '06',
    8: '07', 9: 'おわり', 10: '08', 11: '09', 12: '10', 13: '11',
    14: '12', 15: '13', 16: '14', 17: '15', 18: '16', 19: '17', 20: '裏表紙'
  };

  /* ── 要素 ─────────────────────────────────── */
  var book    = document.getElementById('fbBook');
  var slotL   = document.querySelector('.fb__slot--left');
  var slotR   = document.querySelector('.fb__slot--right');
  var imgL    = document.getElementById('fbLeft');
  var imgR    = document.getElementById('fbRight');
  var flip    = document.getElementById('fbFlip');
  var imgFront= document.getElementById('fbFront');
  var imgBack = document.getElementById('fbBack');
  var btnNext = document.getElementById('fbNext');
  var btnPrev = document.getElementById('fbPrev');
  var hitNext = document.getElementById('fbHitNext');
  var hitPrev = document.getElementById('fbHitPrev');
  var counter = document.getElementById('fbCount');
  var traceO  = document.getElementById('fbTraceO');
  var traceB  = document.getElementById('fbTraceB');
  var walker  = document.getElementById('fbWalker');
  var btnThumbs = document.getElementById('fbThumbs');
  var strip   = document.getElementById('fbThumbStrip');
  var btnFull = document.getElementById('fbFull');
  var btnSpread = document.getElementById('fbSpread');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var single  = false;
  var forced  = null;   // '見開き' / '1ページ' を手動で選んだとき
  var si      = 0;      // 見開き番号
  var page    = 1;      // 1ページ表示のときの現在ページ
  var busy    = false;

  var MAX_SI = Math.floor(TOTAL_PAGES / 2);

  /* ── ヘルパ ───────────────────────────────── */
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function view(i) {
    if (i <= 0)      return { L: 0, R: 1 };
    if (i >= MAX_SI) return { L: 0, R: TOTAL_PAGES };   /* 裏表紙は右側に単独表示 */
    return { L: 2 * i + 1, R: 2 * i };
  }

  function setImg(img, n) {
    var slot = img.parentNode;
    if (!n) {
      img.removeAttribute('src');
      img.alt = '';
      slot.classList.add('is-blank');
    } else {
      img.src = SRC(n);
      img.alt = '『不揃いな靴に選ばれる』' + (FOLIO[n] || n) + 'ページ';
      slot.classList.remove('is-blank');
    }
  }

  function preload(n) {
    if (!n || n < 1 || n > TOTAL_PAGES) return;
    var im = new Image();
    im.src = SRC(n);
  }

  function preloadAround() {
    var c = single ? page : view(si).R || view(si).L;
    for (var d = -3; d <= 4; d++) preload(c + d);
  }

  /* ── 表示更新 ─────────────────────────────── */
  function render() {
    root.classList.toggle('is-single', single);
    if (single) {
      setImg(imgR, page);
      setImg(imgL, 0);
    } else {
      var v = view(si);
      setImg(imgL, v.L);
      setImg(imgR, v.R);
    }
    updateChrome();
    preloadAround();
  }

  function label(s, pg) {
    if (single) return (FOLIO[pg] || pg) + '\u3000/\u3000' + TOTAL_PAGES + 'p';
    var v = view(s);
    if (s <= 0) return '表紙';
    if (s >= MAX_SI) return '裏表紙';
    return FOLIO[v.R] + '\u3000–\u3000' + FOLIO[v.L];
  }

  function progress(s, pg) {
    return single
      ? (pg - 1) / (TOTAL_PAGES - 1)
      : s / MAX_SI;
  }

  /* 引数を渡すと「めくり終わったあとの状態」を先に表示できる。
     めくりアニメーションと進捗バーを同時に動かすために使う。 */
  function updateChrome(s, pg) {
    if (s === undefined) { s = si; pg = page; }
    counter.textContent = label(s, pg);
    var pct = Math.round(progress(s, pg) * 100);
    traceO.style.width = pct + '%';
    traceB.style.width = Math.max(0, pct - 6) + '%';
    if (walker) walker.style.left = pct + '%';

    var atStart = single ? pg <= 1 : s <= 0;
    var atEnd   = single ? pg >= TOTAL_PAGES : s >= MAX_SI;
    btnPrev.disabled = hitPrev.disabled = atStart;
    btnNext.disabled = hitNext.disabled = atEnd;

    if (!strip.hidden) {
      var v = view(s);
      var cur = single ? [pg] : [v.L, v.R];
      Array.prototype.forEach.call(strip.children, function (b) {
        b.classList.toggle('is-current', cur.indexOf(+b.dataset.page) > -1);
      });
    }
  }

  /* ── めくり ───────────────────────────────── */
  function animate(dir, onDone) {
    flip.className = 'fb__flip is-active ' + (dir === 'next' ? 'dir-next' : 'dir-prev');
    if (single) flip.classList.add('is-single');

    var from = 0, to = 0;
    if (single) {
      if (dir === 'next') { from = 0; to = -180; }
      else                { from = -180; to = 0; }
    } else {
      if (dir === 'next') { from = 0; to = -180; }
      else                { from = 0; to = 180; }
    }

    flip.style.transition = 'none';
    flip.style.transform = 'rotateY(' + from + 'deg)';
    flip.style.opacity = (single && dir === 'prev') ? '0' : '1';
    void flip.offsetWidth;                         // reflow
    flip.classList.add('is-turning');
    flip.style.transition = 'transform ' + DURATION + 'ms cubic-bezier(.42,.02,.28,1)'
                          + (single ? ', opacity 260ms linear ' + (dir === 'next' ? DURATION * 0.45 : 0) + 'ms' : '');
    flip.style.transform = 'rotateY(' + to + 'deg)';
    if (single) flip.style.opacity = (dir === 'next') ? '0' : '1';

    window.setTimeout(function () {
      flip.className = 'fb__flip';
      flip.style.transition = 'none';
      flip.style.transform = 'rotateY(0deg)';
      flip.style.opacity = '0';
      onDone();
    }, DURATION + 40);
  }

  function turn(dir) {
    if (busy) return;
    var atStart = single ? page <= 1 : si <= 0;
    var atEnd   = single ? page >= TOTAL_PAGES : si >= MAX_SI;
    if (dir === 'next' && atEnd) return;
    if (dir === 'prev' && atStart) return;

    if (reduced) {
      if (single) page += (dir === 'next' ? 1 : -1);
      else        si   += (dir === 'next' ? 1 : -1);
      render();
      return;
    }

    busy = true;

    var targetSi = si + (dir === 'next' ? 1 : -1);
    if (!single && (targetSi >= MAX_SI || si >= MAX_SI)) {
      /* 裏表紙は綴じの外側なので、紙をめくる動きではなく静かに切り替える */
      book.classList.add('is-fading');
      updateChrome(targetSi, view(targetSi).R || view(targetSi).L);
      window.setTimeout(function () {
        si = targetSi;
        render();
        window.setTimeout(function () {
          book.classList.remove('is-fading');
          busy = false;
        }, 40);
      }, 250);
      return;
    }

    if (single) {
      var target = page + (dir === 'next' ? 1 : -1);
      updateChrome(Math.floor(target / 2), target);   /* バーを同時に走らせる */
      if (dir === 'next') {
        setImg(imgFront, page);
        setImg(imgBack, target);
        setImg(imgR, target);          // めくった下から次のページが出る
      } else {
        setImg(imgFront, target);
        setImg(imgBack, page);
      }
      animate(dir, function () {
        page = target;
        render();
        busy = false;
      });
      return;
    }

    var cur = view(si);
    var nextSi = si + (dir === 'next' ? 1 : -1);
    var nx  = view(nextSi);
    updateChrome(nextSi, nx.R || nx.L);              /* バーを同時に走らせる */

    if (dir === 'next') {
      setImg(imgFront, cur.R);         // めくれる紙のオモテ
      setImg(imgBack,  nx.L);          // その裏
      setImg(imgR,     nx.R);          // 下から現れる右ページ
    } else {
      setImg(imgFront, cur.L);
      setImg(imgBack,  nx.R);
      setImg(imgL,     nx.L);
    }

    animate(dir, function () {
      si += (dir === 'next' ? 1 : -1);
      render();
      busy = false;
    });
  }

  /* ── 任意ページへジャンプ ─────────────────── */
  function goToPage(n) {
    n = Math.min(TOTAL_PAGES, Math.max(1, n | 0));
    page = n;
    si = Math.min(MAX_SI, Math.floor(n / 2));
    render();
  }
  window.flipbookGoTo = goToPage;

  /* ── サムネイル ───────────────────────────── */
  function buildStrip() {
    if (strip.children.length) return;
    var frag = document.createDocumentFragment();
    for (var n = 1; n <= TOTAL_PAGES; n++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.dataset.page = n;
      b.title = (FOLIO[n] || n) + 'ページ';
      var im = document.createElement('img');
      im.src = THUMB(n);
      im.alt = (FOLIO[n] || n) + 'ページ';
      im.loading = 'lazy';
      b.appendChild(im);
      frag.appendChild(b);
    }
    strip.appendChild(frag);
    strip.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b) goToPage(+b.dataset.page);
    });
  }

  /* ── レイアウト切替 ───────────────────────── */
  function syncMode() {
    var wantSingle = forced ? (forced === 'single')
                            : (window.innerWidth <= SINGLE_BREAKPOINT);
    if (btnSpread) btnSpread.textContent = wantSingle ? '見開き表示' : '1ページ表示';
    if (wantSingle === single) return;
    if (wantSingle) page = view(si).R || view(si).L;
    else            si = Math.min(MAX_SI, Math.floor(page / 2));
    single = wantSingle;
    render();
  }

  /* ── イベント ─────────────────────────────── */
  btnNext.addEventListener('click', function () { turn('next'); });
  btnPrev.addEventListener('click', function () { turn('prev'); });
  hitNext.addEventListener('click', function () { turn('next'); });
  hitPrev.addEventListener('click', function () { turn('prev'); });

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var r = root.getBoundingClientRect();
    var visible = r.top < window.innerHeight * 0.75 && r.bottom > window.innerHeight * 0.25;
    if (!visible && !document.fullscreenElement) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); turn('next'); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); turn('prev'); }
    if (e.key === 'Home')       { e.preventDefault(); goToPage(1); }
    if (e.key === 'End')        { e.preventDefault(); goToPage(TOTAL_PAGES); }
  });

  /* スワイプ */
  var sx = 0, sy = 0, tracking = false;
  book.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
  }, { passive: true });
  book.addEventListener('touchend', function (e) {
    if (!tracking) return;
    tracking = false;
    var dx = e.changedTouches[0].clientX - sx;
    var dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy)) return;
    turn(dx < 0 ? 'next' : 'prev');
  }, { passive: true });

  btnThumbs.addEventListener('click', function () {
    buildStrip();
    var open = strip.hidden;
    strip.hidden = !open;
    btnThumbs.setAttribute('aria-expanded', String(open));
    btnThumbs.textContent = open ? '目次を閉じる' : '目次';
    if (open) updateChrome();
  });

  if (btnSpread) {
    btnSpread.addEventListener('click', function () {
      forced = single ? 'spread' : 'single';
      syncMode();
    });
  }

  btnFull.addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (root.requestFullscreen) root.requestFullscreen();
  });
  document.addEventListener('fullscreenchange', function () {
    btnFull.textContent = document.fullscreenElement ? '全画面を終了' : '全画面';
  });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(syncMode, 160);
  });

  /* ── 初期化 ───────────────────────────────── */
  single = window.innerWidth <= SINGLE_BREAKPOINT;
  if (btnSpread) btnSpread.textContent = single ? '見開き表示' : '1ページ表示';
  render();
})();

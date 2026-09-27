(function () {
  'use strict';
  const TRACKS = [
    { id: 'waltz', label: '왈츠', title: 'Valse No. 4 in A Minor', opus: 'Op. 31 No. 2 · Valse mélancolique', performer: 'Aleksander Wierzyński', src: 'media/waltz.mp3', cover: 'covers/waltz.png', displayTitle: 'Valse No. 4 in A Minor, Op. 31 No. 2, "Valse mélancolique"' },
    { id: 'prelude', label: '프렐류드', title: 'Prelude No. 13 in F-sharp Major', opus: 'Op. 45 No. 1', performer: 'Étienne Moreau', src: 'media/prelude.mp3', cover: 'covers/prelude.png', displayTitle: 'Prelude No. 13 in F-sharp Major, Op. 45 No. 1' },
    { id: 'ballade', label: '발라드', title: 'Ballade No. 3 in C Minor', opus: 'Op. 52 No. 1', performer: 'Piotr Nowakowski', src: 'media/ballade.mp3', cover: 'covers/ballade.png', displayTitle: 'Ballade No. 3 in C Minor, Op. 52 No. 1' },
    { id: 'nocturne', label: '녹턴', title: 'Nocturne No. 2 in D-flat Major', opus: 'Op. 15 No. 3', performer: 'Piotr Nowakowski', src: 'media/nocturne.mp3', cover: 'covers/nocturne.png', displayTitle: 'Nocturne No. 2 in D-flat Major, Op. 15 No. 3' }
  ];
  const ORDER = TRACKS.map(t => t.id);
  const mobileQuery = matchMedia('(max-width: 768px), (pointer: coarse)');
  const s = { theme: 'light', volume: .35, order: [...ORDER], excluded: [], random: false, repeatOne: false, size: 0, auto: false };
  const tracks = TRACKS;
  let player, dialog, audio, current = 'waltz', pausedByUser = false, serial = 0;
  const $ = x => player.querySelector(x), q = x => dialog.querySelector(x);
  const track = id => tracks.find(t => t.id === id);
  const ids = () => s.order.filter(id => !s.excluded.includes(id));
  const time = t => !Number.isFinite(t) || t < 0 ? '0:00' : `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  function nextTrack(list, cur, step, random) {
    if (!list.length) return null;
    if (random && list.length > 1) { const pool = list.filter(x => x !== cur); return pool[Math.floor(Math.random() * pool.length)]; }
    const i = list.indexOf(cur); return list[i < 0 ? 0 : (i + step + list.length) % list.length];
  }
  const button = (action, text, label, cls = '') => `<button type="button" class="${cls}" data-action="${action}" title="${label}" aria-label="${label}">${text}</button>`;
  function status(t) { $('.bs-status').textContent = t; if (dialog) q('.bs-feedback').textContent = t; }
  function updateTitleScroll() {
    const box = $('.bs-title'), text = $('.bs-title-text'); if (!box.clientWidth) return;
    const overflow = Math.ceil(text.scrollWidth - box.clientWidth);
    box.classList.toggle('is-scrolling', overflow > 1);
    if (overflow > 1) { box.style.setProperty('--bs-title-shift', `-${overflow}px`); box.style.setProperty('--bs-title-duration', `${Math.max(7, overflow / 26 / .8)}s`); }
  }
  function applyVolume() { audio.volume = mobileQuery.matches ? 1 : s.volume; if (player) player.dataset.mobile = String(mobileQuery.matches); }
  function paint() {
    player.dataset.theme = dialog.dataset.theme = s.theme; player.dataset.size = s.size;
    const expanded = !$('.bs-drawer').hidden; const drawer = $('[data-action="drawer"]');
    drawer.textContent = expanded ? '▲' : '▼'; drawer.setAttribute('aria-expanded', String(expanded));
    drawer.title = drawer.ariaLabel = expanded ? '곡 목록 접기' : '곡 목록 펼치기';
    const t = track(current), title = $('.bs-title-text');
    if (title.textContent !== t.title) { title.textContent = t.title; $('.bs-title').classList.remove('is-scrolling'); }
    $('.bs-title').title = t.title; requestAnimationFrame(updateTitleScroll);
    $('.bs-opus').textContent = t.opus; $('.bs-performer').textContent = t.performer;
    $('.bs-cover').src = t.cover; $('.bs-cover').alt = t.label + ' 음반 표지';
    const play = $('[data-action="play"]'); play.textContent = audio.paused ? '▶' : 'Ⅱ'; play.title = play.ariaLabel = audio.paused ? '재생' : '일시정지';
    for (const [a, v, label] of [['random', s.random, '랜덤재생'], ['repeat', s.repeatOne, '한 곡 반복'], ['auto', s.auto, 'AI 자동 선곡']]) {
      $(`[data-action="${a}"]`).setAttribute('aria-pressed', String(v)); $(`[data-action="${a}"]`).title = label + ': ' + (v ? '켜짐' : '꺼짐');
    }
    $('[data-action="random"]').textContent = s.random ? '⤨' : '→'; $('[data-action="repeat"]').textContent = s.repeatOne ? '↻₁' : '↻';
    $('[data-action="shrink"]').disabled = s.size === 2; $('[data-action="expand"]').disabled = s.size === 0;
    $('[data-action="home"]').disabled = !ids().includes('waltz');
    $('.bs-list').querySelectorAll('[data-id]').forEach(e => e.classList.toggle('is-current', e.dataset.id === current));
    for (const a of ['play', 'next', 'previous']) $(`[data-action="${a}"]`).disabled = !ids().length;
  }
  function progress() {
    const d = audio.duration; $('.bs-elapsed').textContent = time(audio.currentTime); $('.bs-duration').textContent = time(d);
    $('.bs-seek').disabled = !Number.isFinite(d); $('.bs-seek').value = Number.isFinite(d) && d > 0 ? audio.currentTime / d * 1000 : 0;
  }
  async function play() {
    if (!ids().length) return; const n = ++serial;
    try { await audio.play(); } catch { if (n === serial) status('▶ 버튼을 한 번 눌러 재생을 시작해 주세요.'); }
    paint();
  }
  function select(id, shouldPlay = true) {
    if (!ids().includes(id)) return;
    if (current !== id || !audio.src) { current = id; serial++; audio.pause(); audio.src = track(id).src; audio.load(); progress(); }
    paint(); if (shouldPlay && !pausedByUser) void play();
  }
  function navigate(step) { select(nextTrack(ids(), current, step, s.random), !pausedByUser); }
  function constrain() {
    const r = player.getBoundingClientRect();
    const x = Math.min(Math.max(6, r.x), innerWidth - r.width - 6), y = Math.min(Math.max(6, r.y), innerHeight - r.height - 6);
    player.style.left = x + 'px'; player.style.top = y + 'px';
  }
  function list() {
    const root = $('.bs-list'); root.replaceChildren();
    for (const id of ids()) {
      const t = track(id), row = document.createElement('li'); row.dataset.id = id;
      const h = document.createElement('button'); h.type = 'button'; h.className = 'bs-reorder'; h.textContent = '⠿';
      h.ariaLabel = t.label + ' 순서 이동 (위·아래 방향키)'; h.title = '드래그 또는 위·아래 방향키로 순서 변경';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'bs-track';
      b.textContent = t.title.split(' No.')[0] + ' · ' + t.opus;
      b.onclick = () => { pausedByUser = false; select(id); };
      row.append(h, b); root.append(row);
      const move = target => { if (!target || target === id) return; const a = s.order.indexOf(id), z = s.order.indexOf(target); s.order.splice(a, 1); s.order.splice(z, 0, id); };
      h.onkeydown = e => { if (!['ArrowUp', 'ArrowDown'].includes(e.key)) return; e.preventDefault(); const a = ids(), i = a.indexOf(id), j = i + (e.key === 'ArrowUp' ? -1 : 1); if (a[j]) { move(a[j]); list(); $(`[data-id="${id}"] .bs-reorder`).focus(); } };
      let dropTarget = null;
      h.onpointerdown = e => { e.preventDefault(); dropTarget = null; h.setPointerCapture(e.pointerId); row.classList.add('is-dragging'); };
      h.onpointermove = e => { if (!h.hasPointerCapture(e.pointerId)) return; const target = document.elementFromPoint(e.clientX, e.clientY)?.closest('.bs-list li'); root.querySelectorAll('.is-drop').forEach(x => x.classList.remove('is-drop')); if (target && target !== row) { dropTarget = target.dataset.id; target.classList.add('is-drop'); } };
      h.onpointerup = h.onpointercancel = () => { row.classList.remove('is-dragging'); root.querySelectorAll('.is-drop').forEach(x => x.classList.remove('is-drop')); if (dropTarget) move(dropTarget); dropTarget = null; list(); paint(); };
    }
  }
  function openSettings() { q('#bs-theme').value = s.theme; dialog.showModal(); }
  function init() {
    audio = new Audio(); audio.preload = 'metadata'; applyVolume();
    player = document.createElement('aside'); player.id = 'bs-player'; player.setAttribute('aria-label', '비엘라프스키 음악 플레이어');
    player.innerHTML = `<header class="bs-top"><button class="bs-handle" title="드래그로 이동 · 방향키 지원" aria-label="플레이어 이동">⠿</button><span class="bs-brand">BIELAWSKI</span>${button('settings', '⚙', '설정')}${button('shrink', '−', '한 단계 축소')}${button('expand', '+', '한 단계 확대')}</header><section class="bs-art"><img class="bs-cover"><div class="bs-info"><h3 class="bs-title"><span class="bs-title-text"></span></h3><p class="bs-opus"></p><p class="bs-performer"></p></div></section><section class="bs-timeline"><input class="bs-seek" type="range" min="0" max="1000" value="0" aria-label="재생 위치"><div><time class="bs-elapsed">0:00</time><time class="bs-duration">0:00</time></div></section><div class="bs-controls">${button('previous', '&lt;', '이전 곡')}${button('play', '▶', '재생', 'bs-play')}${button('next', '&gt;', '다음 곡')}</div><div class="bs-options">${button('random', '→', '순차·랜덤 전환')}${button('repeat', '↻', '전체·한 곡 반복 전환')}${button('home', '⌂', '기본 왈츠 듣기')}${button('auto', 'AI', 'AI 자동 선곡 전환')}<input class="bs-volume" type="range" min="0" max="1" step=".01" aria-label="음량">${button('drawer', '▼', '곡 목록 펼치기')}</div><p class="bs-status" role="status"></p><section class="bs-drawer" hidden><ol class="bs-list"></ol></section>`;
    dialog = document.createElement('dialog'); dialog.id = 'bs-settings';
    dialog.innerHTML = `<header><h2>Franciszek music player</h2>${button('close', '×', '닫기')}</header><p class="bs-note">오프라인 미리보기입니다. 원본 SillyTavern 확장의 캐릭터 연결·AI 자동 선곡 기능은 채팅 컨텍스트가 필요해 여기서는 동작하지 않습니다.</p><fieldset><legend>화면</legend><label>테마 <select id="bs-theme"><option value="light">화이트 · 리넨</option><option value="dark">다크 · 저녁</option></select></label></fieldset><fieldset><legend>재생할 곡</legend><div class="bs-moods"></div><p class="bs-note">체크 해제는 재생 제외이며 파일을 삭제하지 않습니다.</p></fieldset><p class="bs-feedback" role="status"></p>`;
    document.body.append(player, dialog); applyVolume(); mobileQuery.addEventListener('change', applyVolume);
    new ResizeObserver(updateTitleScroll).observe($('.bs-title')); document.fonts.ready.then(updateTitleScroll);
    for (const t of tracks) {
      const row = document.createElement('div'); row.className = 'bs-mood';
      const label = document.createElement('label'), check = document.createElement('input');
      check.type = 'checkbox'; check.checked = true; check.dataset.track = t.id;
      label.append(check, document.createTextNode(t.displayTitle));
      row.append(label); q('.bs-moods').append(row);
      check.onchange = () => {
        s.excluded = tracks.filter(x => !q(`[data-track="${x.id}"]`).checked).map(x => x.id);
        if (!ids().length) { serial++; audio.pause(); status('재생할 곡을 하나 이상 선택해 주세요'); }
        else if (!ids().includes(current)) select(ids()[0], !pausedByUser);
        list(); paint();
      };
    }
    player.onclick = e => {
      const a = e.target.closest('[data-action]')?.dataset.action; if (!a) return;
      if (a === 'play') { if (audio.paused) { pausedByUser = false; void play(); } else { pausedByUser = true; serial++; audio.pause(); } }
      if (a === 'next') navigate(1);
      if (a === 'previous') navigate(-1);
      if (a === 'home') { pausedByUser = false; select('waltz'); }
      if (a === 'settings') openSettings();
      if (a === 'auto') { s.auto = !s.auto; status(s.auto ? 'AI 자동 선곡은 이 미리보기에서 지원하지 않습니다.' : ''); }
      if (a === 'random') s.random = !s.random;
      if (a === 'repeat') s.repeatOne = !s.repeatOne;
      if (a === 'shrink' || a === 'expand') { s.size = Math.max(0, Math.min(2, s.size + (a === 'shrink' ? 1 : -1))); if (s.size) { $('.bs-drawer').hidden = true; } }
      if (a === 'drawer') { $('.bs-drawer').hidden = !$('.bs-drawer').hidden; }
      paint(); requestAnimationFrame(constrain);
    };
    dialog.onclick = e => { if (e.target.closest('[data-action]')?.dataset.action === 'close') dialog.close(); };
    q('#bs-theme').onchange = e => { s.theme = e.target.value; paint(); };
    $('.bs-volume').value = s.volume;
    $('.bs-volume').oninput = e => { if (mobileQuery.matches) return; s.volume = Number(e.target.value); applyVolume(); };
    $('.bs-seek').oninput = e => { if (Number.isFinite(audio.duration)) audio.currentTime = audio.duration * Number(e.target.value) / 1000; progress(); };
    for (const ev of ['timeupdate', 'durationchange', 'loadedmetadata']) audio.addEventListener(ev, progress);
    for (const ev of ['play', 'pause']) audio.addEventListener(ev, paint);
    audio.onended = () => { if (pausedByUser || !ids().length) return; if (s.repeatOne) { audio.currentTime = 0; void play(); } else navigate(1); };
    audio.onerror = () => status('음악 파일을 읽지 못했습니다. media 폴더가 함께 있는지 확인해 주세요.');
    const h = $('.bs-handle'); let drag;
    h.onpointerdown = e => { const r = player.getBoundingClientRect(); drag = { x: e.clientX - r.x, y: e.clientY - r.y }; h.setPointerCapture(e.pointerId); };
    h.onpointermove = e => { if (!drag) return; player.style.left = e.clientX - drag.x + 'px'; player.style.top = e.clientY - drag.y + 'px'; constrain(); };
    h.onpointerup = h.onpointercancel = () => { drag = null; };
    h.onkeydown = e => { const d = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.key]; if (!d) return; e.preventDefault(); const r = player.getBoundingClientRect(); player.style.left = r.x + d[0] + 'px'; player.style.top = r.y + d[1] + 'px'; constrain(); };
    player.style.left = Math.max(6, innerWidth - 350) + 'px'; player.style.top = '90px';
    window.addEventListener('resize', constrain);
    list(); select('waltz', false); paint();
  }
  document.addEventListener('DOMContentLoaded', init);
})();

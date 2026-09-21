(() => {
  'use strict';
  const videos = [...document.querySelectorAll('.loop-video')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dataSaver = navigator.connection?.saveData;
  let previewsPaused = reducedMotion.matches || !!dataSaver;
  const visible = new Set();
  const manuallyPaused = new WeakSet();
  const motionToggle = document.getElementById('motion-toggle');
  const dialog = document.getElementById('media-dialog');
  const content = document.getElementById('media-content');
  function load(video) {
    if (!video.getAttribute('src')) { video.src = video.dataset.src; video.load(); }
  }
  function updateClip(video) {
    const button = video.parentElement.querySelector('.clip-toggle');
    button.textContent = video.paused ? 'Play' : 'Pause';
    button.setAttribute('aria-label', `${video.paused ? 'Play' : 'Pause'}: ${video.getAttribute('aria-label')}`);
    button.setAttribute('aria-pressed', String(!video.paused));
  }
  function sync() {
    videos.forEach(video => {
      if (visible.has(video) && !video.closest('[hidden]') && !previewsPaused && !manuallyPaused.has(video) && !document.hidden && !dialog.open) {
        load(video); video.play().catch(() => updateClip(video));
      } else video.pause();
    });
    motionToggle.textContent = previewsPaused ? 'Play previews' : 'Pause previews';
    motionToggle.setAttribute('aria-pressed', String(previewsPaused));
  }
  videos.forEach(video => {
    video.muted = true;
    video.addEventListener('play', () => updateClip(video));
    video.addEventListener('pause', () => updateClip(video));
    const button = video.parentElement.querySelector('.clip-toggle');
    const expand = document.createElement('button');
    expand.className = 'clip-expand';
    expand.textContent = 'Expand';
    expand.dataset.video = video.dataset.src;
    expand.dataset.title = video.getAttribute('aria-label');
    expand.setAttribute('aria-label', `Expand: ${video.getAttribute('aria-label')}`);
    video.parentElement.append(expand);
    button.addEventListener('click', () => {
      if (video.paused) { manuallyPaused.delete(video); load(video); video.play().catch(() => { video.controls = true; }); }
      else { manuallyPaused.add(video); video.pause(); }
    });
    video.addEventListener('error', () => { button.textContent = 'Open video'; button.onclick = () => window.open(video.dataset.src, '_blank', 'noopener'); });
    updateClip(video);
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      sync();
    }, {threshold:0.15});
    videos.forEach(video => observer.observe(video));
  } else { videos.forEach(video => visible.add(video)); }
  document.querySelectorAll('.media-tabs').forEach(tablist => {
    const tabs = [...tablist.querySelectorAll('[role="tab"]')];
    const activate = (selected, moveFocus = false) => {
      tabs.forEach(tab => {
        const active = tab === selected;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        const panel = document.getElementById(tab.getAttribute('aria-controls'));
        panel.hidden = !active;
        if (!active) panel.querySelectorAll('video').forEach(video => { visible.delete(video); video.pause(); });
        else if (!('IntersectionObserver' in window)) panel.querySelectorAll('video').forEach(video => visible.add(video));
      });
      if (moveFocus) selected.focus();
      sync();
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activate(tab));
      tab.addEventListener('keydown', event => {
        const positions = {ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1};
        if (event.key in positions) { event.preventDefault(); activate(tabs[positions[event.key]], true); }
      });
    });
  });
  motionToggle.addEventListener('click', () => { previewsPaused = !previewsPaused; if (!previewsPaused) videos.forEach(video => manuallyPaused.delete(video)); sync(); });
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', event => { previewsPaused = event.matches; sync(); });
  document.querySelectorAll('[data-video], [data-image]').forEach(button => {
    button.addEventListener('click', () => {
      content.replaceChildren();
      const isVideo = !!button.dataset.video;
      const src = button.dataset.video || button.dataset.image;
      document.getElementById('media-title').textContent = button.dataset.title;
      document.getElementById('media-description').textContent = button.dataset.description || '';
      document.getElementById('media-direct').href = src;
      const media = document.createElement(isVideo ? 'video' : 'img');
      media.src = src;
      if (isVideo) { media.controls = true; media.playsInline = true; media.preload = 'metadata'; }
      else media.alt = button.dataset.title;
      content.append(media); dialog.showModal(); sync();
      if (isVideo) media.play().catch(() => {});
    });
  });
  document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { const video = content.querySelector('video'); if (video) { video.pause(); video.removeAttribute('src'); video.load(); } content.replaceChildren(); sync(); });
  sync();
})();

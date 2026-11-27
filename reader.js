(() => {
  const book = document.querySelector('.book');
  const pages = [...book.querySelectorAll('.spread')];
  const reader = document.querySelector('.reader');
  const mode = document.querySelector('#mode');
  const prev = document.querySelector('#prev');
  const next = document.querySelector('#next');
  const count = document.querySelector('#pagecount');
  const endnav = document.querySelector('.endnav');
  const compact = matchMedia('(max-width:760px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const cover = document.querySelector('.binding');
  const zoom = document.querySelector('#zoom');
  const mast = document.querySelector('.mast');
  const navigation = mast.querySelector('nav');
  const navigationLinks = [...navigation.querySelectorAll('a')];
  const hero = document.querySelector('.hero');
  const about = document.querySelector('#about');
  const coverStage = document.querySelector('#cover');
  let current = 0;
  let continuous = reduced.matches;
  let animation = null;
  let opener = null;
  const localeButton = document.querySelector('#locale');
  let english = false;
  const textFields = [];
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const source = node.nodeValue.trim();
    if (Object.hasOwn(portfolioEnglish, source)) {
      textFields.push({node, chinese:node.nodeValue, translated:node.nodeValue.replace(source,portfolioEnglish[source])});
    }
  }
  const descriptions = [];
  document.querySelectorAll('[aria-label],img[alt]').forEach(element => {
    for (const attr of ['aria-label','alt']) {
      const chinese = element.getAttribute(attr);
      if (chinese && portfolioEnglish[chinese]) descriptions.push({element,attr,chinese});
    }
  });
  function setLanguage(useEnglish) {
    clearFlip();
    english = useEnglish;
    document.documentElement.lang = english ? 'en' : 'zh-CN';
    textFields.forEach(({node,chinese,translated}) => {node.nodeValue = english ? translated : chinese});
    descriptions.forEach(({element,attr,chinese}) => element.setAttribute(attr, english ? portfolioEnglish[chinese] : chinese));
    localeButton.textContent = english ? '中' : 'EN';
    localeButton.lang = english ? 'zh-CN' : 'en';
    localeButton.setAttribute('aria-label', english ? '切换到中文' : 'Switch to English');
    document.querySelector('#copied').textContent = '';
    render();
  }
  localeButton.addEventListener('click', () => {
    const anchor = document.elementFromPoint(innerWidth / 2, Math.min(innerHeight / 2, 220))?.closest('.sheet,.readerbar,.cover-stage,.about,.hero');
    const before = anchor?.getBoundingClientRect().top;
    setLanguage(!english);
    if (anchor) window.scrollBy(0, anchor.getBoundingClientRect().top - before);
    try {localStorage.setItem('notes-in-progress.locale',document.documentElement.lang)} catch {}
  });

  function clearFlip() {
    if (!animation) return;
    animation.forEach(element => element.remove());
    animation = null;
  }
  function render() {
    pages.forEach((page, i) => page.hidden = !continuous && i !== current);
    book.classList.toggle('continuous', continuous);
    prev.disabled = current === 0;
    next.disabled = current === pages.length - 1;
    endnav.hidden = continuous;
    endnav.querySelector('[data-step="-1"]').disabled = prev.disabled;
    endnav.querySelector('[data-step="1"]').disabled = next.disabled;
    mode.setAttribute('aria-pressed', String(continuous));
    mode.textContent = english ? (continuous ? 'Page view' : 'Continuous view') : (continuous ? '分页阅读' : '连续阅读');
    count.textContent = 'p. ' + pages[current].dataset.pages;
    reader.style.setProperty('--read', (current + 1) / pages.length);
    scheduleLayout();
  }
  function cloneSheet(sheet) {
    const clone = sheet.cloneNode(true);
    clone.removeAttribute('id');
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    return clone;
  }
  function move(to, {turn = false, scroll = true, historyEntry = true} = {}) {
    if (to < 0 || to >= pages.length) return;
    clearFlip();
    const old = current;
    current = to;
    render();
    const forward = to > old;
    if (turn && old !== to && compact.matches && !continuous && !reduced.matches) {
      pages[to].animate([
        {opacity:.77, transform:'translateX(' + (forward ? 8 : -8) + 'px)'},
        {opacity:1, transform:'none'}
      ], {duration:230, easing:'ease-out'});
    }
    if (turn && old !== to && !continuous && !compact.matches && !reduced.matches) {
      const still = document.createElement('div');
      const leaf = document.createElement('div');
      for (const el of [still,leaf]) {
        el.inert = true;
        el.setAttribute('aria-hidden','true');
      }
      still.className = 'flip-still';
      still.style.left = forward ? '0' : '50%';
      still.append(cloneSheet(pages[old].children[forward ? 0 : 1]));
      leaf.className = 'leaf ' + (forward ? 'forward' : 'back');
      const back = cloneSheet(pages[to].children[forward ? 0 : 1]);
      back.classList.add('backface');
      leaf.append(cloneSheet(pages[old].children[forward ? 1 : 0]),back);
      book.append(still,leaf);
      animation = [still,leaf];
      leaf.addEventListener('animationend', () => { if (animation?.includes(leaf)) clearFlip(); }, {once:true});
    }
    if (historyEntry && location.hash !== '#' + pages[to].id) {
      history.pushState(null,'','#' + pages[to].id);
    }
    if (scroll) {
      (continuous ? pages[to] : reader).scrollIntoView({block:'start'});
      pages[to].focus({preventScroll:true});
    }
  }
  function fromLocation() {
    const id = location.hash.slice(1);
    const to = pages.findIndex(page => page.id === id);
    if (to !== -1) return move(to,{historyEntry:false});
  }
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const to = pages.findIndex(page => '#' + page.id === anchor.hash);
    if (to < 0) return;
    event.preventDefault();
    move(to);
    if (anchor.closest('#cover') && !reduced.matches && !compact.matches) {
      book.animate([{opacity:.72, transform:'perspective(1600px) rotateY(-5deg)'},{opacity:1,transform:'none'}],{duration:600,easing:'ease-out'});
    }
  });
  endnav.addEventListener('click', event => {
    const step = event.target.closest('[data-step]');
    if (step) move(current + Number(step.dataset.step),{turn:true});
  });
  prev.onclick = () => move(current - 1,{turn:true});
  next.onclick = () => move(current + 1,{turn:true});
  reader.addEventListener('keydown', event => {
    if (zoom.open || event.altKey || event.ctrlKey || event.metaKey ||
        event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (step) { event.preventDefault(); move(current + step,{turn:true}); }
  });
  mode.onclick = () => {
    clearFlip();
    continuous = !continuous;
    render();
    if (continuous) pages[current].scrollIntoView();
    else reader.scrollIntoView();
  };
  reduced.addEventListener('change', () => { clearFlip(); continuous = reduced.matches; render(); });
  compact.addEventListener('change', clearFlip);
  window.addEventListener('hashchange', fromLocation);
  let drag = null;
  book.addEventListener('pointerdown', e => {
    if (continuous || !e.isPrimary || e.button !== 0 || e.target.closest('button,a')) return;
    const rect = book.getBoundingClientRect();
    const distance = Math.min(e.clientX - rect.left,rect.right - e.clientX);
    if (distance < 55) drag = {x:e.clientX,y:e.clientY,id:e.pointerId};
  });
  window.addEventListener('pointerup', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag = null;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy)*1.5) move(current + (dx < 0 ? 1 : -1),{turn:true});
  });
  window.addEventListener('pointercancel', () => drag = null);
  book.addEventListener('click', event => {
    const button = event.target.closest('.enlarge');
    if (!button) return;
    opener = button;
    const image = button.querySelector('img');
    const enlarged = zoom.querySelector('img');
    enlarged.src = button.dataset.full || image.src;
    enlarged.alt = image.alt;
    zoom.querySelector('p').textContent = image.alt;
    zoom.showModal();
  });
  zoom.querySelector('button').onclick = () => zoom.close();
  zoom.addEventListener('close', () => opener?.focus({preventScroll:true}));
  document.querySelector('#copy').onclick = async () => {
    const email = document.querySelector('.email').textContent;
    try {
      await navigator.clipboard.writeText(email);
      document.querySelector('#copied').textContent = english ? 'Email address copied.' : '邮箱已复制';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('.email'));
      getSelection().removeAllRanges();
      getSelection().addRange(range);
      document.querySelector('#copied').textContent = english ? 'Email address selected. You can copy it now.' : '邮箱已选中，可手动复制。';
    }
  };
  let frame = 0;
  function updateLayout() {
    frame = 0;
    const bounds = hero.getBoundingClientRect();
    mast.classList.toggle('compact', bounds.bottom < bounds.height * .5);
    const line = Math.min(innerHeight * .45, 260);
    const inReader = coverStage.getBoundingClientRect().top <= line;
    let index = -1;
    if (inReader) {
      const contact = pages[pages.length - 1];
      const atContact = continuous ? contact.getBoundingClientRect().top <= line : current === pages.length - 1;
      index = atContact ? 2 : 1;
    } else if (about.getBoundingClientRect().top <= line) index = 0;
    navigation.toggleAttribute('data-active', index >= 0);
    if (index >= 0) navigation.style.setProperty('--section', index);
    navigationLinks.forEach((link, i) => {
      if (i === index) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    });
    if (continuous) {
      const lastRead = pages.findLastIndex(page => page.getBoundingClientRect().top <= line);
      const visible = Math.max(lastRead, 0);
      reader.style.setProperty('--read', (visible + 1) / pages.length);
      if (current !== visible) {
        current = visible;
        render();
      }
    }
    if (!reduced.matches && !compact.matches) {
      const distance = cover.getBoundingClientRect().top / Math.max(1,innerHeight);
      cover.style.setProperty('--yaw', Math.max(0, Math.min(1,(distance-.25)*2))*20 + 'deg');
    }
  }
  function scheduleLayout() {
    if (!frame) frame = requestAnimationFrame(updateLayout);
  }
  window.addEventListener('scroll', scheduleLayout,{passive:true});
  window.addEventListener('resize', scheduleLayout);
  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        if (!reduced.matches) entry.target.classList.add('arriving');
        reveals.unobserve(entry.target);
      }
    }, {rootMargin:'0px 0px -25% 0px'});
    document.querySelectorAll('.about h2,.about>div,.cover-caption').forEach(el=>reveals.observe(el));
  }
  let savedLocale;
  try {savedLocale = localStorage.getItem('notes-in-progress.locale')} catch {}
  setLanguage(savedLocale === 'en');
  fromLocation();
})();

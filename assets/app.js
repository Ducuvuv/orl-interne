/* ORL Interne — application (vanilla JS, aucune dépendance) */
(() => {
  'use strict';
  const D = window.ORL;
  if (!D) { document.getElementById('view').innerHTML = '<p class="empty">Données introuvables (data/content.js). Lancez <code>python tools/build.py</code>.</p>'; return; }

  // ---------- utilitaires ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n) => `<svg><use href="#i-${n}"/></svg>`;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('orl:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem('orl:' + k, JSON.stringify(v)); } catch { /* stockage indisponible */ } },
  };
  const foldCache = new Map();
  function foldChar(c) {
    let f = foldCache.get(c);
    if (f === undefined) { f = (c.normalize('NFD')[0] || c).toLowerCase(); f = f.length === 1 ? f : c; foldCache.set(c, f); }
    return f;
  }
  /** minuscule sans accents, MÊME longueur que l'entrée (pour aligner les extraits) */
  function fold(s) { let o = ''; for (let i = 0; i < s.length; i++) o += foldChar(s[i]); return o; }

  const ART = !!window.ORL_ARTIFACT; // page publiée en Artifact : pas d'impression, pas de service worker, pas de routage par URL
  if (ART) document.documentElement.classList.add('is-artifact');
  let curPath = '/';
  const stack = [];
  /** navigation interne (n'utilise l'URL que hors Artifact) */
  function go(path, replace) {
    if (path === curPath && !replace) { render(); return; }
    if (!replace) stack.push(curPath);
    curPath = path;
    if (!ART) { try { history[replace ? 'replaceState' : 'pushState'](null, '', '#' + path); } catch { /* ignore */ } }
    render();
  }
  /** met à jour le chemin courant sans re-rendre (filtres, recherche) */
  function setPath(path) { curPath = path; if (!ART) { try { history.replaceState(null, '', '#' + path); } catch { /* ignore */ } } }

  const SEC = D.sections;
  const SPEC = D.specialites;
  const specColor = (sp) => `var(--c-${sp || 'transversal'})`;
  const docs = D.docs;
  const byId = Object.fromEntries(docs.map((d) => [d.id, d]));
  const ordoByRef = Object.fromEntries(D.ordos.map((o) => [o.ref, o]));
  const modByRef = Object.fromEntries(D.modeles.map((m) => [m.ref, m]));
  const secIcon = { fiches: 'book', urgences: 'siren', postop: 'scalpel', textes: 'text', outils: 'tool' };
  const secLabel = { fiches: 'Pathologies', urgences: 'Urgences de garde', postop: 'Post-op', textes: 'Textes types', outils: 'Outils' };
  const SHORT = {
    "L'essentiel": 'Essentiel', 'Prise en charge': 'PEC', 'Surveillance et quand reconsulter': 'Suivi · reconsulter',
    'Ordonnances': 'Ordos', 'Conseils patient': 'Conseils', 'Complications à surveiller': 'Complications',
    'Consignes post-opératoires': 'Consignes', 'Ordonnances de sortie': 'Ordos de sortie',
    'Quand reconsulter en urgence': 'Reconsulter', 'Gestes immédiats': 'Gestes',
  };
  const view = $('#view');
  const DRAFT = !!window.ORL_DRAFT;
  const draftBanner = () => DRAFT ? '<div class="box box-alerte draft"><div class="box-title">Version en cours de rédaction</div>Les fiches sont en cours de relecture et de vérification des posologies : ne pas s’en servir pour prescrire avant la version validée.</div>' : '';
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); }

  // index de recherche (construit à la première recherche)
  let indexed = false;
  function buildIndex() {
    if (indexed) return;
    for (const d of docs) {
      d._ft = fold(d.text);
      d._fh = fold([d.titre, d.sous_titre, (d.tags || []).join(' ')].join(' '));
    }
    for (const o of D.ordos) o._f = fold(o.titre + ' ' + o.public + ' ' + o.type + ' ' + o.text);
    for (const m of D.modeles) m._f = fold(m.titre + ' ' + m.text);
    indexed = true;
  }

  // ---------- favoris / récents ----------
  const favs = () => store.get('favs', []);
  const isFav = (id) => favs().includes(id);
  function toggleFav(id) { const f = favs(); const i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.unshift(id); store.set('favs', f); return i < 0; }
  function pushRecent(id) { const r = store.get('recents', []).filter((x) => x !== id); r.unshift(id); store.set('recents', r.slice(0, 8)); }

  // ---------- rendu des listes ----------
  function rowDoc(d, sub) {
    const s = sub ?? d.sous_titre;
    return `<a class="row" href="#/d/${d.id}" style="--c:${specColor(d.specialite)}">
      <span class="dot"></span><span class="grow"><span class="t">${esc(d.titre)}</span>${s ? `<span class="s">${esc(s)}</span>` : ''}</span>
      ${d.urgence && d.section !== 'urgences' ? '<span class="badge-urg">Urgence</span>' : ''}${icon('chev')}</a>`;
  }
  const listCard = (rows) => rows.length ? `<div class="card list">${rows.join('')}</div>` : '<p class="empty">Rien pour le moment.</p>';
  const inSec = (s) => docs.filter((d) => d.section === s);

  // ---------- barre latérale ----------
  function sidebar(active) {
    const link = (href, ic, label, count, cls = '') =>
      `<a class="side-link ${cls} ${active === href ? 'active' : ''}" href="${href}">${icon(ic)}<span>${label}</span>${count != null ? `<span class="count">${count}</span>` : ''}</a>`;
    const specs = Object.keys(SPEC).filter((sp) => inSec('fiches').some((d) => d.specialite === sp));
    $('#sidebar').innerHTML = `
      <div class="side-group">
        ${link('#/', 'home', 'Accueil')}
        ${link('#/s/urgences', 'siren', 'Garde', inSec('urgences').length, 'urg')}
        ${link('#/ordos', 'rx', 'Ordonnances', D.ordos.length)}
        ${link('#/favoris', 'star', 'Favoris', favs().length || null)}
      </div>
      <div class="side-group"><div class="side-title">Pathologies</div>
        ${link('#/s/fiches', 'book', 'Toutes les fiches', inSec('fiches').length)}
        ${specs.map((sp) => `<a class="side-link ${active === '#/s/fiches/' + sp ? 'active' : ''}" href="#/s/fiches/${sp}"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5" fill="${specColor(sp)}" stroke="none"/></svg><span>${SPEC[sp]}</span><span class="count">${inSec('fiches').filter((d) => d.specialite === sp).length}</span></a>`).join('')}
      </div>
      <div class="side-group"><div class="side-title">Pratique</div>
        ${link('#/s/postop', 'scalpel', 'Post-op', inSec('postop').length)}
        ${link('#/s/textes', 'text', 'Textes types', inSec('textes').length)}
        ${link('#/s/outils', 'tool', 'Outils & scores', inSec('outils').length)}
        ${link('#/atlas', 'image', 'Atlas d\'imagerie', D.figures.length)}
        ${link('#/reglages', 'gear', 'Réglages')}
      </div>`;
  }

  // ---------- vues ----------
  function vHome() {
    const urg = [...inSec('urgences'), ...inSec('fiches').filter((d) => d.urgence)];
    const recents = store.get('recents', []).map((id) => byId[id]).filter(Boolean);
    const fv = favs().map((id) => byId[id]).filter(Boolean);
    const specs = Object.keys(SPEC).filter((sp) => inSec('fiches').some((d) => d.specialite === sp));
    const tile = (href, ic, t, s, c) => `<a class="card tile" href="${href}" style="--c:${c}"><span class="ic">${icon(ic)}</span><span class="tt">${t}</span><span class="ts">${s}</span></a>`;
    view.innerHTML = `
      ${draftBanner()}
      <section class="hero">
        <h1>ORL Interne</h1>
        <p class="page-sub">Fiches ORL, ordonnances types, post-op et réflexes de garde — Collège d'ORL 2022 + recommandations les plus récentes.</p>
        <form class="bigsearch" id="homesearch" role="search">${icon('search')}<input type="search" placeholder="OMA, épistaxis, amoxicilline, trachéo…" enterkeyhint="search" aria-label="Rechercher"></form>
      </section>
      ${urg.length ? `<div class="section-h"><h2>Réflexes de garde</h2><a href="#/s/urgences">Tout voir</a></div>
      <div class="chips">${urg.slice(0, 14).map((d) => `<a class="chip urg" href="#/d/${d.id}">${esc(d.titre.replace(/^Urgence\s*[:—-]\s*/i, ''))}</a>`).join('')}</div>` : ''}
      <div class="section-h"><h2>Accès rapide</h2></div>
      <div class="tiles">
        ${tile('#/s/fiches', 'book', 'Pathologies', `${inSec('fiches').length} fiches`, 'var(--accent)')}
        ${tile('#/ordos', 'rx', 'Ordonnances', `${D.ordos.length} ordos · ${D.modeles.filter((m) => m.kind === 'conseil').length} conseils`, 'var(--c-rhinologie)')}
        ${tile('#/s/urgences', 'siren', 'Garde', `${inSec('urgences').length} protocoles`, 'var(--danger)')}
        ${tile('#/s/postop', 'scalpel', 'Post-op', `${inSec('postop').length} chirurgies`, 'var(--c-pharynx-larynx)')}
        ${tile('#/s/textes', 'text', 'Textes types', `${D.modeles.filter((m) => m.kind === 'modele').length} modèles`, 'var(--c-otologie)')}
        ${tile('#/s/outils', 'tool', 'Outils & scores', `${inSec('outils').length} outils`, 'var(--c-cervical)')}
      </div>
      <div class="section-h"><h2>Par spécialité</h2><a href="#/atlas">Atlas d'imagerie (${D.figures.length})</a></div>
      <div class="spec-grid">${specs.map((sp) => `<a class="card spec" href="#/s/fiches/${sp}" style="--c:${specColor(sp)}"><i></i>${SPEC[sp]}<span>${inSec('fiches').filter((d) => d.specialite === sp).length}</span></a>`).join('')}</div>
      ${fv.length ? `<div class="section-h"><h2>Favoris</h2><a href="#/favoris">Gérer</a></div>${listCard(fv.slice(0, 6).map((d) => rowDoc(d)))}` : ''}
      ${recents.length ? `<div class="section-h"><h2>Consultés récemment</h2></div>${listCard(recents.slice(0, 5).map((d) => rowDoc(d)))}` : ''}
      <p class="disclaimer">Aide-mémoire personnel — ne remplace ni le jugement clinique, ni l'avis du senior, ni les protocoles du service. Vérifier allergies, terrain, interactions et fonction rénale avant toute prescription. Données compilées le ${esc(D.built)}.</p>`;
    $('#homesearch').addEventListener('submit', (e) => { e.preventDefault(); const q = $('input', e.target).value.trim(); if (q) go('/recherche?q=' + encodeURIComponent(q)); });
    $('#homesearch input').addEventListener('input', debounce((e) => { const q = e.target.value.trim(); if (q.length >= 2) go('/recherche?q=' + encodeURIComponent(q)); }, 450));
  }

  function vSection(sec, spec) {
    let list = inSec(sec);
    let title = secLabel[sec] || SEC[sec];
    let sub = '';
    if (spec) { list = list.filter((d) => d.specialite === spec); title = SPEC[spec] || spec; sub = secLabel[sec]; }
    let html = `<h1>${esc(title)}</h1>${sub ? `<p class="page-sub">${esc(sub)}</p>` : ''}`;
    if (sec === 'fiches' || sec === 'postop') {
      const groups = Object.keys(SPEC).map((sp) => [sp, list.filter((d) => d.specialite === sp)]).filter(([, l]) => l.length);
      if (!spec) html += `<div class="chips" style="margin:6px 0 4px">${groups.map(([sp, l]) => `<a class="chip" href="#/s/${sec}/${sp}"><span style="width:8px;height:8px;border-radius:50%;background:${specColor(sp)}"></span>${SPEC[sp]} · ${l.length}</a>`).join('')}</div>`;
      html += groups.map(([sp, l]) => `${spec ? '' : `<div class="section-h"><h2 style="color:${specColor(sp)}">${SPEC[sp]}</h2><span>${l.length}</span></div>`}${listCard(l.map((d) => rowDoc(d, sec === 'fiches' && d.items?.length ? `Item ${d.items.join(', ')}${d.sous_titre ? ' · ' + d.sous_titre : ''}` : undefined)))}`).join('');
    } else if (sec === 'urgences') {
      html += `<p class="page-sub">Protocoles « 1 écran » pour la garde. En cas de détresse : <b>appeler le senior</b> sans attendre.</p>`;
      html += listCard(list.map((d) => rowDoc(d)));
      const fu = inSec('fiches').filter((d) => d.urgence);
      if (fu.length) html += `<div class="section-h"><h2>Fiches complètes urgentes</h2></div>${listCard(fu.map((d) => rowDoc(d)))}`;
    } else {
      html += listCard(list.map((d) => rowDoc(d)));
    }
    view.innerHTML = html;
  }

  function vDoc(id, anchor) {
    const d = byId[id];
    if (!d) { view.innerHTML = '<p class="empty">Document introuvable.</p>'; return; }
    pushRecent(id);
    const fav = isFav(id);
    const crumbs = [
      `<a href="#/s/${d.section}">${esc(secLabel[d.section] || d.section)}</a>`,
      d.specialite ? `<span class="sp">${esc(SPEC[d.specialite] || d.specialite)}</span>` : '',
      ...(d.items || []).map((n) => `<span class="item">Item ${esc(n)}</span>`),
      d.urgence ? '<span class="urg">Urgence</span>' : '',
    ].filter(Boolean).join('');
    const toc = d.toc.length > 1 ? `<nav class="toc" id="toc">${d.toc.map((t) => `<a href="#" data-target="${t.id}">${esc(SHORT[t.titre] || t.titre)}</a>`).join('')}</nav>` : '';
    const voir = (d.voir_aussi || []).map((v) => byId[v]).filter(Boolean);
    view.style.setProperty('--c', specColor(d.specialite));
    view.innerHTML = `
      <article>
        ${draftBanner()}
        <header class="doc-head">
          <div class="crumbs">${crumbs}</div>
          <h1>${esc(d.titre)}</h1>
          ${d.sous_titre ? `<p class="doc-sub">${esc(d.sous_titre)}</p>` : ''}
          <div class="doc-actions">
            <button class="btn ${fav ? 'fav-on' : ''}" data-act="fav">${icon('star')}<span>${fav ? 'Favori' : 'Ajouter aux favoris'}</span></button>
            <button class="btn" data-act="print-doc">${icon('print')}<span>Imprimer</span></button>
          </div>
        </header>
        ${toc}
        <div class="prose">${d.html}</div>
        <footer class="doc-foot">
          ${voir.length ? `<h3>Voir aussi</h3><div class="voir">${voir.map((v) => `<a class="chip" href="#/d/${v.id}">${esc(v.titre)}</a>`).join('')}</div>` : ''}
          ${d.sources?.length ? `<h3>Sources</h3><ol>${d.sources.map((s) => `<li>${linkify(esc(s))}</li>`).join('')}</ol>` : ''}
          <p>${d.maj ? `Mise à jour : ${esc(d.maj)}. ` : ''}À adapter au patient et aux protocoles du service.</p>
        </footer>
      </article>`;
    setupToc();
    if (anchor) { const el = document.getElementById(anchor); if (el) setTimeout(() => el.scrollIntoView({ block: 'start' }), 30); }
    mountWidgets(view);
    const firstPed = $('.prose .ordo .rx-ped', view);
    if (firstPed) {
      let anchor = firstPed.closest('.ordo'), h = anchor;
      while (h && h.tagName !== 'H2') h = h.previousElementSibling;
      mountWeight(view, h && h.nextElementSibling ? h.nextElementSibling : anchor);
    }
  }

  function linkify(s) { return s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>'); }

  let tocScroll;
  function setupToc() {
    const toc = $('#toc');
    if (tocScroll) window.removeEventListener('scroll', tocScroll);
    if (!toc) return;
    toc.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-target]'); if (!a) return;
      e.preventDefault();
      const el = document.getElementById(a.dataset.target); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const heads = $$('.prose h2[id]');
    const links = Object.fromEntries($$('a', toc).map((a) => [a.dataset.target, a]));
    let cur = null, ticking = false;
    const update = () => {
      ticking = false;
      let id = heads[0]?.id;
      for (const h of heads) { if (h.getBoundingClientRect().top < 150) id = h.id; else break; }
      if (id === cur) return; cur = id;
      Object.values(links).forEach((l) => l.classList.remove('on'));
      const l = links[id];
      if (l) { l.classList.add('on'); toc.scrollTo({ left: l.offsetLeft - toc.clientWidth / 2 + l.clientWidth / 2, behavior: 'smooth' }); }
    };
    tocScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', tocScroll, { passive: true });
    update();
  }

  // ---------- ordonnances ----------
  function vOrdos(params) {
    const mode = params.get('m') || 'ordos';
    const type = params.get('t') || '';
    const pub = params.get('p') || '';
    const q0 = params.get('q') || '';
    const conseils = D.modeles.filter((m) => m.kind === 'conseil');
    const modeles = D.modeles.filter((m) => m.kind === 'modele');
    const types = [...new Set(D.ordos.map((o) => o.type))].filter(Boolean);
    const pubs = ['Adulte', 'Enfant', 'Allergie'];
    const url = (o) => { const p = new URLSearchParams({ m: mode, t: type, p: pub, q: q0, ...o }); [...p.keys()].forEach((k) => !p.get(k) && p.delete(k)); return '#/ordos' + (p.toString() ? '?' + p : ''); };
    view.innerHTML = `
      <h1>Ordonnances & documents</h1>
      <p class="page-sub">${ART ? 'Prêtes à copier dans le logiciel de prescription.' : 'Prêtes à copier dans le logiciel ou à imprimer (en-tête prescripteur dans Réglages).'}</p>
      <div class="seg full" role="tablist">
        <button class="${mode === 'ordos' ? 'on' : ''}" data-m="ordos">Ordos · ${D.ordos.length}</button>
        <button class="${mode === 'conseils' ? 'on' : ''}" data-m="conseils">Conseils · ${conseils.length}</button>
        <button class="${mode === 'textes' ? 'on' : ''}" data-m="textes">Textes · ${modeles.length}</button>
      </div>
      <div class="filters">
        <input type="search" id="ordo-q" placeholder="Filtrer : amoxicilline, enfant, TDM, IDE…" value="${esc(q0)}">
        ${mode === 'ordos' ? `<div class="chips">${['', ...types].map((t) => `<a class="chip ${t === type ? 'on' : ''}" href="${url({ t })}">${t || 'Tous types'}</a>`).join('')}</div>
        <div class="chips">${['', ...pubs].map((p) => `<a class="chip ${p === pub ? 'on' : ''}" href="${url({ p })}">${p || 'Tout public'}</a>`).join('')}</div>` : ''}
      </div>
      <div id="ordo-list"></div>`;
    $$('.seg button', view).forEach((b) => b.addEventListener('click', () => { go(url({ m: b.dataset.m, t: '', p: '' }).slice(1), true); }));
    const draw = () => {
      buildIndex();
      const terms = fold($('#ordo-q').value.trim()).split(/\s+/).filter(Boolean);
      const match = (f) => terms.every((t) => f.includes(t));
      let html = '';
      if (mode === 'ordos') {
        const list = D.ordos.filter((o) => (!type || o.type === type) && (!pub || fold(o.public).includes(fold(pub))) && match(o._f));
        html = groupByDoc(list, (o) => ordoCard(o, true));
        if (!list.length) html = '<p class="empty">Aucune ordonnance ne correspond.</p>';
      } else {
        const src = mode === 'conseils' ? conseils : modeles;
        const list = src.filter((m) => match(m._f));
        html = groupByDoc(list, (m) => modCard(m)) || '<p class="empty">Aucun document ne correspond.</p>';
      }
      $('#ordo-list').innerHTML = (mode === 'ordos' && /rx-ped/.test(html) ? weightBar() : '') + html;
      if (mode === 'ordos') mountWeight($('#ordo-list'));
    };
    $('#ordo-q').addEventListener('input', debounce(() => {
      draw();
      const p = new URLSearchParams(curPath.split('?')[1] || ''); const v = $('#ordo-q').value.trim();
      if (v) p.set('q', v); else p.delete('q');
      setPath('/ordos' + (p.toString() ? '?' + p : ''));
    }, 160));
    draw();
  }
  function groupByDoc(list, card) {
    const groups = new Map();
    for (const x of list) { if (!groups.has(x.doc)) groups.set(x.doc, []); groups.get(x.doc).push(x); }
    return [...groups].map(([did, xs]) => {
      const d = byId[did];
      return `<div class="ordo-group" style="--c:${specColor(d?.specialite)}"><h3><i></i><a href="#/d/${did}">${esc(d?.titre || did)}</a></h3>${xs.map(card).join('')}</div>`;
    }).join('');
  }
  function ordoCard(o, compact) {
    const parts = o.titre.split(/\s+[—–-]\s+/).filter(Boolean);
    return `<div class="ordo ${compact ? 'compact' : ''}" data-ref="${esc(o.ref)}">
      <div class="ordo-head" data-act="toggle"><div class="ordo-tags"><span class="tag tag-type">${esc(o.type)}</span><span class="tag tag-public">${esc(o.public)}</span></div><h4>${esc(parts[0] || o.titre)}</h4>${parts.length > 1 ? `<div class="ordo-sub">${esc(parts.slice(1).join(' · '))}</div>` : ''}${o.note ? `<details class="ordo-info"><summary>Indication · précautions</summary><div>${esc(o.note)}</div></details>` : ''}</div>
      <div class="ordo-body">${o.html}</div>
      <div class="actions"><button class="btn" data-act="copy" data-ref="${esc(o.ref)}">${icon('copy')}Copier</button><button class="btn" data-act="print-ordo" data-ref="${esc(o.ref)}">${icon('print')}Imprimer</button></div>
    </div>`;
  }
  function modCard(m) {
    const k = m.kind === 'conseil';
    return `<div class="${k ? 'conseil' : 'modele'} ${''}"><div class="${k ? 'conseil' : 'modele'}-head"><span class="tag ${k ? 'tag-conseil' : 'tag-modele'}">${k ? 'Conseil patient' : 'Texte type'}</span><h4>${esc(m.titre)}</h4></div>
      <div class="${k ? 'conseil' : 'modele'}-body">${m.html}</div>
      <div class="actions"><button class="btn" data-act="copy" data-ref="${esc(m.ref)}">${icon('copy')}Copier</button>${k ? `<button class="btn" data-act="print-conseil" data-ref="${esc(m.ref)}">${icon('print')}Imprimer</button>` : ''}</div></div>`;
  }

  // ---------- recherche ----------
  function vSearch(q) {
    view.innerHTML = `<h1>Recherche</h1>
      <form class="bigsearch" id="s-form" role="search">${icon('search')}<input type="search" value="${esc(q)}" placeholder="Pathologie, molécule, geste, classification…" enterkeyhint="search" aria-label="Rechercher"></form>
      <div id="s-res"></div>`;
    const inp = $('#s-form input');
    const run = () => {
      const v = inp.value.trim();
      setPath('/recherche' + (v ? '?q=' + encodeURIComponent(v) : ''));
      $('#s-res').innerHTML = searchHtml(v);
      const tq = $('#q'); if (tq && document.activeElement !== tq) tq.value = v;
    };
    $('#s-form').addEventListener('submit', (e) => { e.preventDefault(); inp.blur(); run(); });
    inp.addEventListener('input', debounce(run, 140));
    run();
    if (!q) setTimeout(() => inp.focus(), 50);
  }
  function searchHtml(q) {
    if (q.length < 2) return '<p class="empty">Tapez au moins 2 caractères.</p>';
    buildIndex();
    const terms = fold(q).split(/\s+/).filter((t) => t.length > 0);
    const res = [];
    for (const d of docs) {
      let score = 0; let ok = true;
      for (const t of terms) {
        const inH = d._fh.includes(t); const inT = d._ft.includes(t);
        if (!inH && !inT) { ok = false; break; }
        if (fold(d.titre).includes(t)) score += 40;
        if (inH) score += 15;
        if (inT) score += Math.min(12, countOcc(d._ft, t));
      }
      if (ok) res.push([score + (d.section === 'fiches' ? 3 : 0), d]);
    }
    res.sort((a, b) => b[0] - a[0]);
    const ordos = D.ordos.filter((o) => terms.every((t) => o._f.includes(t))).slice(0, 12);
    if (!res.length && !ordos.length) return `<p class="empty">Aucun résultat pour « ${esc(q)} ».</p>`;
    let html = '';
    if (res.length) {
      html += `<div class="res-group"><h3>Documents · ${res.length}</h3><div class="card list">${res.slice(0, 40).map(([, d]) => {
        const sn = snippet(d.text, d._ft, terms);
        return `<a class="row" href="#/d/${d.id}" style="--c:${specColor(d.specialite)}"><span class="dot"></span><span class="grow"><span class="t">${hl(d.titre, terms)}</span><span class="s" style="-webkit-line-clamp:1">${esc(secLabel[d.section])}${d.specialite ? ' · ' + esc(SPEC[d.specialite]) : ''}</span>${sn ? `<div class="snip">${sn}</div>` : ''}</span>${icon('chev')}</a>`;
      }).join('')}</div></div>`;
    }
    if (ordos.length) html += `<div class="res-group"><h3>Ordonnances · ${ordos.length}${ordos.length === 12 ? '+' : ''}</h3>${ordos.map((o) => ordoCard(o, true)).join('')}</div>`;
    return html;
  }
  function countOcc(s, t) { let n = 0, i = 0; while ((i = s.indexOf(t, i)) !== -1 && n < 50) { n++; i += t.length; } return n; }
  function snippet(text, ft, terms) {
    let pos = -1;
    for (const t of terms) { const i = ft.indexOf(t); if (i >= 0 && (pos < 0 || i < pos)) pos = i; }
    if (pos < 0) return '';
    const a = Math.max(0, pos - 70), b = Math.min(text.length, pos + 150);
    let s = text.slice(a, b).replace(/\s+/g, ' ');
    return (a > 0 ? '… ' : '') + hl(s, terms) + (b < text.length ? ' …' : '');
  }
  function hl(s, terms) {
    const f = fold(s); const marks = new Array(s.length).fill(false);
    for (const t of terms) { let i = 0; while ((i = f.indexOf(t, i)) !== -1) { for (let k = i; k < i + t.length; k++) marks[k] = true; i += t.length; } }
    let out = '', open = false;
    for (let i = 0; i < s.length; i++) {
      if (marks[i] && !open) { out += '<mark>'; open = true; }
      if (!marks[i] && open) { out += '</mark>'; open = false; }
      out += esc(s[i]);
    }
    return out + (open ? '</mark>' : '');
  }

  // ---------- atlas / favoris / réglages ----------
  function vAtlas(params) {
    const sp = params.get('sp') || '';
    const figs = D.figures.filter((f) => !sp || byId[f.doc]?.specialite === sp);
    const specs = Object.keys(SPEC).filter((s) => D.figures.some((f) => byId[f.doc]?.specialite === s));
    view.innerHTML = `<h1>Atlas d'imagerie</h1><p class="page-sub">${D.figures.length} images légendées (otoscopie, endoscopie, TDM, IRM, schémas). Touchez une image pour l'agrandir.</p>
      <div class="chips" style="margin-bottom:14px">${['', ...specs].map((s) => `<a class="chip ${s === sp ? 'on' : ''}" href="#/atlas${s ? '?sp=' + s : ''}">${s ? SPEC[s] : 'Tout'}</a>`).join('')}</div>
      ${figs.length ? `<div class="atlas">${figs.map((f) => `<a class="card" href="#/d/${f.doc}/${f.anchor}"><img src="${esc(f.src)}" alt="${esc(f.titre)}" loading="lazy"><span>${esc(f.titre || 'Figure')}<small>${esc(byId[f.doc]?.titre || '')}</small></span></a>`).join('')}</div>` : '<p class="empty">Aucune image.</p>'}`;
  }
  function vFavs() {
    const fv = favs().map((id) => byId[id]).filter(Boolean);
    view.innerHTML = `<h1>Favoris</h1><p class="page-sub">Ajoutez une fiche avec ★ depuis sa page.</p>${listCard(fv.map((d) => rowDoc(d)))}`;
  }
  function vSettings() {
    const p = store.get('prescripteur', {});
    const theme = store.get('theme', 'auto'); const font = store.get('font', 'normal');
    const f = (k, label, ph) => `<label>${label}<input data-k="${k}" value="${esc(p[k] || '')}" placeholder="${esc(ph)}"></label>`;
    view.innerHTML = `<h1>Réglages</h1>
      <div class="section-h"><h2>Affichage</h2></div>
      <div class="card form">
        <div><div style="font-size:13.5px;font-weight:600;color:var(--muted);margin-bottom:6px">Thème</div><div class="seg" id="seg-theme">${[['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']].map(([v, l]) => `<button data-v="${v}" class="${theme === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
        <div><div style="font-size:13.5px;font-weight:600;color:var(--muted);margin-bottom:6px">Taille du texte</div><div class="seg" id="seg-font">${[['normal', 'Normale'], ['large', 'Grande']].map(([v, l]) => `<button data-v="${v}" class="${font === v ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      </div>
      <div class="section-h no-art"><h2>En-tête des ordonnances imprimées</h2></div>
      <div class="card form no-art" id="presc">
        ${f('nom', 'Nom du prescripteur', 'Dr Prénom NOM')}
        ${f('fonction', 'Fonction', 'Interne en ORL et chirurgie cervico-faciale')}
        ${f('service', 'Service', "Service d'ORL et de chirurgie cervico-faciale")}
        ${f('etablissement', 'Établissement', 'CHU de …')}
        ${f('adresse', 'Adresse', 'Adresse du service')}
        ${f('tel', 'Téléphone', 'Secrétariat / standard')}
        ${f('rpps', 'N° RPPS', '')}
        <p class="muted" style="margin:0;font-size:12.5px;color:var(--faint)">Enregistré uniquement sur cet appareil.</p>
      </div>
      <div class="section-h no-art"><h2>Hors-ligne</h2></div>
      <div class="card form no-art">
        <p style="margin:0;font-size:14px">L'application fonctionne sans réseau une fois ouverte en ligne (installée sur l'écran d'accueil). Pour tout pré-charger, y compris les ${D.figures.length} images :</p>
        <button class="btn primary" id="btn-offline" style="justify-self:start">Tout télécharger pour le hors-ligne</button>
        <span id="off-state" class="muted" style="font-size:13px;color:var(--muted)"></span>
      </div>
      <p class="disclaimer">Contenu compilé le ${esc(D.built)} · ${docs.length} documents · ${D.ordos.length} ordonnances · ${D.figures.length} figures.</p>`;
    const seg = (sel, key, apply) => $$(sel + ' button', view).forEach((b) => b.addEventListener('click', () => {
      $$(sel + ' button', view).forEach((x) => x.classList.toggle('on', x === b)); store.set(key, b.dataset.v); apply(b.dataset.v);
    }));
    seg('#seg-theme', 'theme', (v) => { if (v === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = v; });
    seg('#seg-font', 'font', (v) => { document.documentElement.dataset.font = v; });
    $$('#presc input', view).forEach((i) => i.addEventListener('input', () => { const o = store.get('prescripteur', {}); o[i.dataset.k] = i.value; store.set('prescripteur', o); }));
    $('#btn-offline').addEventListener('click', async () => {
      const st = $('#off-state');
      if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) { st.textContent = 'Disponible uniquement quand l\'application est servie en ligne (GitHub Pages / serveur).'; return; }
      const urls = [...new Set(D.figures.map((f) => f.src))];
      let n = 0;
      for (const u of urls) { try { await fetch(u, { cache: 'reload' }); } catch { /* ignore */ } n++; st.textContent = `${n} / ${urls.length} images…`; }
      st.textContent = `Terminé : ${urls.length} images en cache.`;
    });
  }

  // ---------- poids de l'enfant → doses calculées dans les ordonnances ----------
  let pedW = null;
  try { const v = parseFloat(sessionStorage.getItem('orl:poids')); if (v > 0) pedW = v; } catch { /* ignore */ }
  const fr = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('fr-FR', { maximumFractionDigits: d });
  function doseFor(el, w) {
    const g = (k) => (el.dataset[k] != null ? parseFloat(el.dataset[k]) : null);
    const n = g('n'); if (!n) return null;
    let per, capped = false;
    const maxDay = Math.min(g('maxj') ?? Infinity, g('maxkgj') != null ? g('maxkgj') * w : Infinity);
    if (g('mgkgj') != null) {
      let day = g('mgkgj') * w; if (day > maxDay) { day = maxDay; capped = true; }
      per = day / n;
    } else if (g('mgkgp') != null) {
      per = g('mgkgp') * w; if (per * n > maxDay) { per = maxDay / n; capped = true; }
    } else return null;
    if (g('maxp') != null && per > g('maxp')) { per = g('maxp'); capped = true; }
    const ml = g('conc') ? per / g('conc') : null;
    return { mg: per, ml, capped, nomax: g('maxj') == null && g('maxp') == null && g('maxkgj') == null };
  }
  function applyWeight(root) {
    const w = pedW;
    $$('.rx-ped', root).forEach((rx) => {
      $$('.rx-poids .blank', rx).forEach((b) => { b.textContent = w ? fr(w) : ''; });
      $$('.rx-item', rx).forEach((it) => {
        const old = $('.rx-calc', it); if (old) old.remove();
        const blanks = $$('.blank', it);
        const r = w && (it.dataset.mgkgj || it.dataset.mgkgp) ? doseFor(it, w) : null;
        blanks.forEach((b) => {
          const u = b.dataset.u;
          b.textContent = !w ? '' : u === 'kg' ? fr(w) : !r ? '' : u === 'mg' ? fr(r.mg, r.mg < 10 ? 1 : 0) : u === 'mL' && r.ml != null ? fr(r.ml) : u === 'g' ? fr(r.mg / 1000, 2) : '';
          b.classList.toggle('filled', !!b.textContent);
        });
        if (r) {
          const hasMg = blanks.some((b) => b.dataset.u === 'mg' && b.textContent);
          const hasMl = blanks.some((b) => b.dataset.u === 'mL' && b.textContent);
          const info = [];
          if (!hasMg && hasMl) info.push(`soit <b>${fr(r.mg, r.mg < 10 ? 1 : 0)} mg</b> par prise`);
          else if (!hasMg) info.push(`<b>${fr(r.mg, r.mg < 10 ? 1 : 0)} mg</b> par prise${r.ml != null ? ` = <b>${fr(r.ml)} mL</b>` : ''}`);
          if (r.capped) info.push('plafonné à la dose maximale');
          if (r.nomax) info.push('dose maximale non précisée : vérifier');
          if (w >= 40) info.push('≥ 40 kg : posologie adulte');
          if (info.length) it.querySelector('.rx-c').insertAdjacentHTML('beforeend', `<div class="rx-calc">Pour ${fr(w)} kg : ${info.join(' · ')}</div>`);
        }
      });
    });
    $$('.wbar input', root).forEach((i) => { if (document.activeElement !== i) i.value = w ? String(w).replace('.', ',') : ''; });
    $$('.wbar .wclear', root).forEach((b) => { b.hidden = !w; });
  }
  function weightBar() {
    return `<div class="wbar"><label for="wbar-${Math.random().toString(36).slice(2, 7)}">Poids de l'enfant</label>
      <div class="wrow"><input type="text" inputmode="decimal" placeholder="—" aria-label="Poids de l'enfant en kg" class="winput"><span>kg</span>
      <button class="btn wclear" type="button" hidden>Effacer</button></div>
      <p>Les doses des ordonnances « enfant » se remplissent automatiquement (à vérifier).</p></div>`;
  }
  function mountWeight(root, before) {
    if (!$('.rx-ped', root)) return;
    if (before) before.insertAdjacentHTML('beforebegin', weightBar());
    $$('.wbar', root).forEach((bar) => {
      const i = $('input', bar);
      i.addEventListener('input', () => {
        const v = parseFloat(i.value.replace(',', '.'));
        pedW = v > 0 && v < 150 ? v : null;
        try { if (pedW) sessionStorage.setItem('orl:poids', String(pedW)); else sessionStorage.removeItem('orl:poids'); } catch { /* ignore */ }
        applyWeight(document);
      });
      $('.wclear', bar).addEventListener('click', () => { pedW = null; try { sessionStorage.removeItem('orl:poids'); } catch { /* ignore */ } applyWeight(document); });
    });
    applyWeight(root);
  }
  /** texte copiable d'une ordonnance telle qu'affichée (doses calculées incluses) */
  function rxText(rx) {
    const val = (node) => {
      const c = node.cloneNode(true);
      $$('.blank', c).forEach((b) => { b.textContent = b.textContent || '____'; });
      $$('.rx-calc', c).forEach((x) => x.remove());
      return c.textContent.replace(/\s+/g, ' ').trim();
    };
    if (rx.classList.contains('rx-letter')) return rx.innerText.trim();
    const out = [];
    [...rx.children].forEach((ch) => {
      if (ch.classList.contains('rx-item')) {
        const lines = [val($('.rx-name', ch)), ...$$('.rx-l', ch).map(val)];
        out.push(lines.join('\n'));
      } else out.push(val(ch));
    });
    return out.join('\n\n');
  }

  // ---------- widgets (calculateurs, scores) ----------
  const PEDIA = [
    { id: 'amox50', l: 'Amoxicilline — angine à SGA (≥ 3 ans)', mgkgj: 50, prises: [2], maxj: 2000, dur: '6 jours', forms: [['Suspension 125 mg/5 mL', 25], ['Suspension 250 mg/5 mL', 50], ['Suspension 500 mg/5 mL', 100]], src: 'HAS/SPILF/GPIP 2024-2025' },
    { id: 'amox80', l: 'Amoxicilline — OMA purulente, sinusite (80 mg/kg/j)', mgkgj: 80, prises: [2], maxj: 3000, dur: 'OMA : 10 j si < 2 ans, 5 j si ≥ 2 ans (10 j si otorrhée/récidive) · sinusite : 10 j', forms: [['Suspension 125 mg/5 mL', 25], ['Suspension 250 mg/5 mL', 50], ['Suspension 500 mg/5 mL', 100]], src: 'HAS/SPILF/GPIP MAJ 2025' },
    { id: 'amc80', l: 'Amoxicilline + acide clavulanique — otite-conjonctivite, sinusite dentaire (dose en amoxicilline)', mgkgj: 80, prises: [2, 3], maxj: 3000, dur: 'OMA : 10 j si < 2 ans, 5 j si ≥ 2 ans · sinusite dentaire : 10 j', forms: [['Suspension 100 mg/12,5 mg par mL', 100]], src: 'HAS MAJ 2025 (otite-conjonctivite : 2 prises/j ; sinusite dentaire : prises selon RCP)' },
    { id: 'cefpo400', l: 'Cefpodoxime — OMA, sinusite (allergie pénicilline)', mgkgj: 8, prises: [2], maxj: 400, dur: 'OMA : 10 j si < 2 ans, 5 j si ≥ 2 ans · sinusite : 10 j', forms: [['Suspension 40 mg/5 mL', 8]], src: 'HAS MAJ 2025' },
    { id: 'cefpo200', l: 'Cefpodoxime — angine (allergie pénicilline)', mgkgj: 8, prises: [2], maxj: 200, dur: '5 jours', forms: [['Suspension 40 mg/5 mL', 8]], src: 'HAS MAJ 2025' },
    { id: 'clari', l: 'Clarithromycine — angine (CI aux β-lactamines)', mgkgj: 15, prises: [2], maxj: 500, dur: '5 jours', forms: [['Suspension 25 mg/mL', 25], ['Suspension 50 mg/mL', 50]], src: 'HAS MAJ 2025' },
    { id: 'cotri', l: 'Cotrimoxazole — OMA, sinusite (CI aux β-lactamines) — dose en sulfaméthoxazole', mgkgj: 30, prises: [2], maxj: 800, dur: 'OMA : 10 j si < 2 ans, 5 j si ≥ 2 ans · sinusite : 10 j', forms: [['Suspension 200 mg SMX + 40 mg TMP / 5 mL', 40]], note: '+ triméthoprime 6 mg/kg/j (max 160 mg/j), apporté par la même suspension.', src: 'HAS MAJ 2025' },
    { id: 'prist', l: 'Pristinamycine — sinusite ≥ 6 ans (CI aux β-lactamines)', mgkgj: 50, prises: [2], maxj: 2000, dur: '10 jours', forms: [], note: 'Comprimés à 250 mg ou 500 mg : arrondir à la dose réalisable.', src: 'HAS MAJ 2025' },
    { id: 'para', l: 'Paracétamol', mgkgp: 15, prises: [4], maxj: 4000, maxkgj: 80, maxp: 1000, dur: '72 h max en contexte infectieux sans réévaluation', forms: [['Suspension 2,4 % (24 mg/mL)', 24]], note: '15 mg/kg toutes les 6 h (60 mg/kg/j), max 80 mg/kg/j.', src: 'HAS 2025 / RCP' },
    { id: 'ibu', l: 'Ibuprofène (≥ 3 mois, douleur, 2e intention)', mgkgp: 10, prises: [3], maxj: 1200, maxkgj: 30, maxp: 400, dur: '24 h max de 3 à 6 mois · 72 h max après 6 mois (infection)', forms: [['Suspension 20 mg/mL', 20]], note: "Pas d'AINS si infection ORL bactérienne sévère/compliquée ni varicelle. Jamais pour la fièvre seule.", src: 'HAS 2025 / ANSM' },
    { id: 'pred', l: 'Prednisolone (1 mg/kg/j)', mgkgj: 1, prises: [1], maxj: 60, dur: 'selon indication', forms: [], note: '1 prise le matin. Comprimés orodispersibles 5 mg / 20 mg : arrondir.', src: 'RCP' },
  ];
  const r1 = (x) => Math.round(x * 10) / 10;
  const W = {
    'calc-pedia'(el) {
      el.innerHTML = `<div class="card calc"><div style="font-weight:800">Calculateur de doses pédiatriques</div>
        <div class="grid2"><label>Poids (kg)<input type="number" inputmode="decimal" min="1" max="120" step="0.1" id="pw" placeholder="ex. 14"></label>
        <label>Prises / jour<select id="pp"></select></label></div>
        <label>Médicament<select id="pd">${PEDIA.map((p) => `<option value="${p.id}">${esc(p.l)}</option>`).join('')}</select></label>
        <div class="out" id="po">Saisir le poids.</div>
        <div class="muted">Résultats arrondis — vérifier le RCP, la fonction rénale et les allergies. Dose adulte si ≥ 40 kg.</div></div>`;
      const pw = $('#pw', el), pd = $('#pd', el), pp = $('#pp', el), po = $('#po', el);
      const fillPrises = () => { const p = PEDIA.find((x) => x.id === pd.value); pp.innerHTML = p.prises.map((n) => `<option>${n}</option>`).join(''); };
      const calc = () => {
        const p = PEDIA.find((x) => x.id === pd.value); const w = parseFloat(String(pw.value).replace(',', '.'));
        if (!w || w <= 0) { po.innerHTML = 'Saisir le poids.'; return; }
        const n = parseInt(pp.value, 10) || p.prises[0];
        let perDose, daily, capped = false;
        if (p.mgkgp) {
          perDose = p.mgkgp * w; if (p.maxp && perDose > p.maxp) { perDose = p.maxp; capped = true; }
          daily = perDose * n;
          const cap = Math.min(p.maxj, (p.maxkgj || Infinity) * w); if (daily > cap) { daily = cap; perDose = cap / n; capped = true; }
        } else {
          daily = p.mgkgj * w; if (daily > p.maxj) { daily = p.maxj; capped = true; }
          perDose = daily / n;
        }
        const ml = p.forms.map(([lab, c]) => `<div>${esc(lab)} : <b>${r1(perDose / c)} mL</b> par prise</div>`).join('');
        po.innerHTML = `<div><b>${r1(perDose)} mg</b> par prise × ${n}/j &nbsp;=&nbsp; ${r1(daily)} mg/j</div>${ml}
          ${capped ? '<div class="warn">Plafonné à la dose maximale.</div>' : ''}${w >= 40 ? '<div class="warn">≥ 40 kg : utiliser les formes et posologies adultes.</div>' : ''}
          <div class="muted" style="margin-top:6px">Durée : ${esc(p.dur)}${p.note ? ' · ' + esc(p.note) : ''} · Source : ${esc(p.src)}</div>`;
      };
      fillPrises();
      pd.addEventListener('change', () => { fillPrises(); calc(); }); pw.addEventListener('input', calc); pp.addEventListener('change', calc);
    },
    'score-mcisaac'(el) {
      const items = [['Température > 38 °C', 1], ['Absence de toux', 1], ['Adénopathie(s) cervicale(s) antérieure(s) douloureuse(s)', 1], ['Augmentation de volume ou exsudat amygdalien', 1]];
      el.innerHTML = `<div class="card calc"><div style="font-weight:800">Score de Mac Isaac (≥ 15 ans)</div><div class="score-list">
        ${items.map(([l, v], i) => `<label><input type="checkbox" data-v="${v}" id="mi${i}">${esc(l)} (+${v})</label>`).join('')}
        <label>Âge <select id="mia" style="margin-left:auto"><option value="0">15 – 44 ans (0)</option><option value="-1">≥ 45 ans (−1)</option></select></label></div><div class="out" id="mio"></div></div>`;
      const calc = () => {
        const s = $$('input[type=checkbox]', el).reduce((a, c) => a + (c.checked ? +c.dataset.v : 0), 0) + parseInt($('#mia', el).value, 10);
        $('#mio', el).innerHTML = `Score = <b>${s}</b> — ${s >= 2 ? '<b>TDR</b> : antibiotique seulement si positif.' : 'SGA peu probable : <b>ni TDR ni antibiotique</b>.'}`;
      };
      el.addEventListener('change', calc); calc();
    },
    'score-epworth'(el) {
      const sit = ['Assis en train de lire', 'En regardant la télévision', 'Assis, inactif, dans un lieu public (cinéma, réunion…)', "Passager d'une voiture (ou transport en commun) roulant sans arrêt pendant une heure",
        "Allongé l'après-midi lorsque les circonstances le permettent", "Assis en parlant avec quelqu'un", 'Assis au calme après un déjeuner sans alcool', "Au volant d'une voiture immobilisée quelques minutes dans un embouteillage"];
      el.innerHTML = `<div class="card calc"><div style="font-weight:800">Échelle de somnolence d'Epworth</div><div class="muted">0 = jamais · 1 = faible chance · 2 = chance moyenne · 3 = forte chance de s'endormir</div><div class="score-list">
        ${sit.map((s, i) => `<label>${esc(s)}<select data-i="${i}" style="margin-left:auto;width:auto">${[0, 1, 2, 3].map((v) => `<option>${v}</option>`).join('')}</select></label>`).join('')}</div><div class="out" id="epo"></div></div>`;
      const calc = () => { const s = $$('select', el).reduce((a, c) => a + +c.value, 0); $('#epo', el).innerHTML = `Score = <b>${s}</b> / 24 — ${s > 10 ? '<b>somnolence diurne excessive</b> (> 10)' : 'pas de somnolence excessive (≤ 10)'}`; };
      el.addEventListener('change', calc); calc();
    },
    'score-stopbang'(el) {
      const it = ['Ronflement fort (S)', 'Fatigue / somnolence diurne (T)', 'Apnées observées (O)', 'HTA traitée ou non (P)', 'IMC > 35 kg/m² (B)', 'Âge > 50 ans (A)', 'Tour de cou ≥ 43 cm (homme) ou ≥ 41 cm (femme) (N)', 'Sexe masculin (G)'];
      el.innerHTML = `<div class="card calc"><div style="font-weight:800">STOP-Bang</div><div class="score-list">${it.map((l) => `<label><input type="checkbox">${esc(l)}</label>`).join('')}</div><div class="out" id="sbo"></div></div>`;
      const calc = () => { const s = $$('input', el).filter((c) => c.checked).length; $('#sbo', el).innerHTML = `Score = <b>${s}</b> / 8 — risque de SAOS modéré à sévère <b>${s >= 5 ? 'élevé' : s >= 3 ? 'intermédiaire' : 'faible'}</b> (0-2 faible · 3-4 intermédiaire · 5-8 élevé)`; };
      el.addEventListener('change', calc); calc();
    },
    'notes-service'(el) {
      const SECTIONS = [
        ['numeros', 'Numéros utiles', 'Bip senior de garde, secrétariat, bloc, réa, SAU, radiologie, labo…'],
        ['garde', 'Organisation de la garde', 'Qui appeler, quand, circuit des avis aux urgences, transmissions…'],
        ['antalgie', 'Protocole d’antalgie du service', 'Adulte, enfant, amygdalectomie…'],
        ['antibio', 'Antibioprophylaxie / antibiothérapie (protocoles locaux)', 'Molécules et doses habituelles du service…'],
        ['thrombo', 'Thromboprophylaxie', 'HBPM utilisée, délais, durée…'],
        ['chir', 'Habitudes opératoires', 'Mèches, drains, sorties, consultations post-op, arrêts de travail par chirurgie…'],
        ['divers', 'Divers', 'Codes, logiciels, astuces…'],
      ];
      const key = (k) => 'orl:notes:' + k;
      const read = (k) => { try { return localStorage.getItem(key(k)) || ''; } catch { return ''; } };
      const write = (k, v) => { try { localStorage.setItem(key(k), v); return true; } catch { return false; } };
      el.innerHTML = `<div class="card calc"><div style="font-weight:800">Mes notes de service</div>
        <div class="muted">Enregistrées uniquement sur cet appareil (dans ce navigateur). Pensez à les copier de temps en temps.</div>
        ${SECTIONS.map(([k, t, ph]) => `<label>${esc(t)}<textarea data-k="${k}" rows="4" placeholder="${esc(ph)}" style="width:100%;min-height:96px;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font:inherit;font-size:15px;resize:vertical"></textarea></label>`).join('')}
        <div class="chips"><button class="btn" type="button" data-n="copy">Copier toutes les notes</button><span class="muted" data-n="state"></span></div></div>`;
      const state = $('[data-n="state"]', el);
      $$('textarea', el).forEach((t) => {
        t.value = read(t.dataset.k);
        t.addEventListener('input', debounce(() => { state.textContent = write(t.dataset.k, t.value) ? 'Enregistré' : 'Stockage indisponible sur cet appareil'; }, 400));
      });
      $('[data-n="copy"]', el).addEventListener('click', async () => {
        const txt = SECTIONS.map(([k, t]) => { const v = read(k).trim(); return v ? `## ${t}\n${v}` : ''; }).filter(Boolean).join('\n\n');
        toast(txt ? ((await copyText(txt)) ? 'Notes copiées' : 'Copie impossible') : 'Aucune note');
      });
    },
    'calc-calcemie'(el) {
      el.innerHTML = `<div class="card calc"><div style="font-weight:800">Calcémie corrigée par l'albumine</div><div class="grid2">
        <label>Calcémie totale (mmol/L)<input type="number" step="0.01" inputmode="decimal" id="cca" placeholder="ex. 2,05"></label>
        <label>Albumine (g/L)<input type="number" step="0.1" inputmode="decimal" id="cal" placeholder="ex. 32"></label></div>
        <div class="out" id="cco">Ca corrigée = Ca mesurée + 0,02 × (40 − albumine)</div><div class="muted">Préférer la calcémie ionisée si disponible (normale ≈ 1,15-1,30 mmol/L). Normes du laboratoire prioritaires.</div></div>`;
      const calc = () => {
        const ca = parseFloat($('#cca', el).value.replace(',', '.')), al = parseFloat($('#cal', el).value.replace(',', '.'));
        if (!ca || !al) return;
        const c = ca + 0.02 * (40 - al);
        $('#cco', el).innerHTML = `Calcémie corrigée = <b>${(Math.round(c * 100) / 100).toFixed(2)} mmol/L</b> — ${c < 2.2 ? '<b>hypocalcémie</b> (< 2,20)' : c > 2.6 ? '<b>hypercalcémie</b> (> 2,60)' : 'normale (2,20-2,60)'}`;
      };
      el.addEventListener('input', calc);
    },
  };
  function mountWidgets(root) { $$('.widget[data-widget]', root).forEach((el) => { const f = W[el.dataset.widget]; if (f) f(el); else el.innerHTML = `<p class="empty">Widget « ${esc(el.dataset.widget)} » inconnu.</p>`; }); }

  // ---------- actions (copier / imprimer / favoris / zoom) ----------
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch {
      const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; } ta.remove(); return ok;
    }
  }
  function sheetHead() {
    const p = store.get('prescripteur', {});
    const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    return `<div class="sheet-head"><div class="who"><b>${esc(p.nom || '')}</b><br>${esc(p.fonction || '')}${p.rpps ? `<br>RPPS : ${esc(p.rpps)}` : ''}</div>
      <div class="where">${esc(p.service || '')}<br>${esc(p.etablissement || '')}${p.adresse ? `<br>${esc(p.adresse)}` : ''}${p.tel ? `<br>Tél. : ${esc(p.tel)}` : ''}</div></div>
      <div style="text-align:right;font-family:Arial,sans-serif;font-size:10.5pt;margin-bottom:8px">Le ${today}</div>`;
  }
  function printSheet(inner) {
    const pa = $('#print-area'); pa.innerHTML = `<div class="sheet">${inner}</div>`;
    document.body.classList.add('print-sheet');
    const done = () => { document.body.classList.remove('print-sheet'); pa.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 30);
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (b) {
      const act = b.dataset.act; const ref = b.dataset.ref;
      if (act === 'toggle') { const card = b.closest('.ordo.compact'); if (card) card.classList.toggle('open'); return; }
      e.preventDefault();
      if (act === 'copy') {
        const card = b.closest('.ordo'); const rx = card && $('.rx', card);
        const o = ordoByRef[ref] || modByRef[ref]; if (!o) return;
        const txt = rx ? rxText(rx) : o.text;
        toast((await copyText(txt)) ? 'Copié dans le presse-papiers' : 'Copie impossible');
      } else if (act === 'print-ordo') {
        const o = ordoByRef[ref]; if (!o) return;
        const card = b.closest('.ordo'); const rx = card && $('.rx', card);
        const body = rx ? rx.outerHTML : o.html;
        printSheet(`${sheetHead()}<div class="sheet-patient">Patient(e) :<i style="width:72mm"></i> Né(e) le :<i style="width:28mm"></i> Poids :<i style="width:14mm"></i>kg</div>
          <div class="sheet-body">${body}</div><div class="sheet-sign">Signature</div>`);
      } else if (act === 'print-conseil') {
        const m = modByRef[ref]; if (!m) return;
        const p = store.get('prescripteur', {});
        printSheet(`<div class="sheet-head"><div class="who"><b>${esc(p.service || 'Service d\'ORL')}</b><br>${esc(p.etablissement || '')}</div><div class="where">${p.tel ? 'Tél. : ' + esc(p.tel) : ''}</div></div>
          <p class="sheet-title">${esc(m.titre)}</p><div class="sheet-body" style="font-family:Arial,sans-serif;font-size:11.5pt">${m.html}</div>
          <div class="sheet-foot">Fiche d'information remise au patient — en cas d'urgence vitale, appelez le 15.</div>`);
      } else if (act === 'print-doc') {
        window.print();
      } else if (act === 'fav') {
        const id = curPath.split('?')[0].split('/')[2]; const on = toggleFav(id);
        b.classList.toggle('fav-on', on); $('span', b).textContent = on ? 'Favori' : 'Ajouter aux favoris'; toast(on ? 'Ajouté aux favoris' : 'Retiré des favoris');
      }
      return;
    }
    const z = e.target.closest('a[data-zoom]');
    if (z) {
      e.preventDefault();
      const fig = z.closest('figure'); const lb = $('#lightbox');
      $('img', lb).src = z.getAttribute('href'); $('img', lb).alt = $('img', z)?.alt || '';
      $('figcaption', lb).innerHTML = fig?.querySelector('figcaption')?.innerHTML || '';
      lb.hidden = false; document.body.style.overflow = 'hidden';
    }
  });
  function closeLb() { const lb = $('#lightbox'); if (lb.hidden) return; lb.hidden = true; document.body.style.overflow = ''; $('img', lb).src = ''; }
  $('#lightbox').addEventListener('click', (e) => { if (e.target.tagName !== 'A') closeLb(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLb();
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); const q = $('#q'); if (q && getComputedStyle($('#topsearch')).display !== 'none') q.focus(); else go('/recherche'); }
  });

  // recherche dans la barre du haut (desktop)
  $('#topsearch').addEventListener('submit', (e) => { e.preventDefault(); const v = $('#q').value.trim(); go('/recherche' + (v ? '?q=' + encodeURIComponent(v) : '')); });
  $('#q').addEventListener('input', debounce(() => {
    const v = $('#q').value.trim();
    if (curPath.startsWith('/recherche')) { const i = $('#s-form input'); if (i) { i.value = v; i.dispatchEvent(new Event('input')); } }
    else if (v.length >= 2) go('/recherche?q=' + encodeURIComponent(v));
  }, 250));
  $('#btn-back').addEventListener('click', () => {
    if (!stack.length) { go('/'); return; }
    if (ART) { curPath = stack.pop(); render(); } else { stack.pop(); history.back(); }
  });
  // tous les liens internes passent par le routeur
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#/"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault(); go(a.getAttribute('href').slice(1));
  });

  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

  // ---------- routeur ----------
  function readLoc() {
    let h = ''; try { h = decodeURIComponent(location.hash.slice(1)); } catch { h = location.hash.slice(1); }
    if (h.startsWith('/')) return h;
    if (byId[h]) return '/d/' + h; // lien direct #id-de-fiche (seul format transmis par un Artifact)
    if (['ordos', 'atlas', 'favoris', 'reglages', 'recherche'].includes(h)) return '/' + h;
    if (['urgences', 'postop', 'outils', 'textes', 'fiches'].includes(h)) return '/s/' + h;
    return '/';
  }
  function render() {
    const raw = curPath || '/';
    const [path, qs] = raw.split('?');
    const params = new URLSearchParams(qs || '');
    const parts = path.split('/').filter(Boolean);
    closeLb();
    view.style.removeProperty('--c');
    let active = '#/' + parts.join('/');
    let tab = 'home';
    if (!parts.length) vHome();
    else if (parts[0] === 'd') { vDoc(parts[1], parts[2]); const d = byId[parts[1]]; active = d ? (d.section === 'fiches' ? '#/s/fiches/' + d.specialite : '#/s/' + d.section) : active; tab = d?.section === 'urgences' || d?.urgence ? 'urgences' : d?.section === 'postop' ? 'postop' : d?.section === 'outils' ? 'outils' : 'home'; }
    else if (parts[0] === 's') { vSection(parts[1], parts[2]); tab = ['urgences', 'postop', 'outils'].includes(parts[1]) ? parts[1] : 'home'; }
    else if (parts[0] === 'ordos') { vOrdos(params); active = '#/ordos'; tab = 'ordos'; }
    else if (parts[0] === 'recherche') vSearch(params.get('q') || '');
    else if (parts[0] === 'atlas') { vAtlas(params); active = '#/atlas'; }
    else if (parts[0] === 'favoris') vFavs();
    else if (parts[0] === 'reglages') vSettings();
    else view.innerHTML = '<p class="empty">Page introuvable.</p>';
    sidebar(active);
    $$('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
    $('#btn-back').hidden = !parts.length;
    const d = parts[0] === 'd' ? byId[parts[1]] : null;
    document.title = d ? `${d.titre} — ORL Interne` : 'ORL Interne';
    if (!(parts[0] === 'd' && parts[2])) window.scrollTo(0, 0);
  }
  window.addEventListener('popstate', () => { if (!ART) { curPath = readLoc(); render(); } });
  window.addEventListener('hashchange', () => { if (!ART) { const p = readLoc(); if (p !== curPath) { curPath = p; render(); } } });
  curPath = readLoc();
  render();

  if (!ART && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();

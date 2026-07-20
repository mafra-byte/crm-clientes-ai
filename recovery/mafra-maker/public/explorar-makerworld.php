<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Escolher modelo | Mafra Maker</title>
  <script>window.MAKER_WEB_BASE="";</script>  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --ink: #14181f;
      --ink-soft: #3a4554;
      --muted: #6b7685;
      --line: rgba(20, 24, 31, 0.12);
      --paper: #f3f1ec;
      --panel: #fffdf9;
      --accent: #d97706;
      --accent-ink: #9a3412;
      --accent-soft: rgba(217, 119, 6, 0.12);
      --ok: #1f7a45;
      --ok-soft: rgba(31, 122, 69, 0.12);
      --shadow: 0 18px 50px rgba(20, 24, 31, 0.08);
      --radius: 18px;
      --font: "Manrope", sans-serif;
      --display: "Syne", sans-serif;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }
    body {
      font-family: var(--font);
      color: var(--ink);
      background:
        radial-gradient(1200px 600px at 10% -10%, rgba(217, 119, 6, 0.16), transparent 55%),
        radial-gradient(900px 500px at 100% 0%, rgba(20, 24, 31, 0.06), transparent 50%),
        linear-gradient(180deg, #efece5 0%, var(--paper) 45%, #e7e2d8 100%);
      min-height: 100%;
    }
    .shell {
      width: min(1120px, calc(100% - 28px));
      margin: 0 auto;
      padding: 22px 0 36px;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
      animation: rise .45s ease both;
    }
    .brand {
      font-family: var(--display);
      font-size: clamp(1.8rem, 4vw, 2.4rem);
      font-weight: 800;
      letter-spacing: -.04em;
      line-height: 1;
      margin: 0;
    }
    .brand span { color: var(--accent); }
    .sub {
      margin: 8px 0 0;
      color: var(--muted);
      max-width: 36rem;
      line-height: 1.45;
      font-size: 1rem;
    }
    .back {
      color: var(--ink-soft);
      text-decoration: none;
      font-weight: 600;
      font-size: .95rem;
      padding: 10px 14px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: rgba(255,253,249,.7);
      backdrop-filter: blur(6px);
      transition: transform .15s ease, border-color .15s ease;
    }
    .back:hover { transform: translateY(-1px); border-color: rgba(20,24,31,.25); }

    .layout {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 18px;
      align-items: stretch;
      flex: 1;
      min-height: 0;
      animation: rise .55s ease .05s both;
    }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
    }

    .rail, .studio {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
    }
    .rail {
      padding: 22px 20px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    .steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
    .step {
      display: grid;
      grid-template-columns: 34px 1fr;
      gap: 12px;
      align-items: start;
      opacity: .55;
      transition: opacity .25s ease, transform .25s ease;
    }
    .step.is-active, .step.is-done { opacity: 1; }
    .step.is-active { transform: translateX(2px); }
    .step-num {
      width: 34px; height: 34px; border-radius: 12px;
      display: grid; place-items: center;
      font-family: var(--display);
      font-weight: 700;
      background: #ece7de;
      color: var(--ink-soft);
    }
    .step.is-active .step-num {
      background: var(--accent);
      color: #fff;
    }
    .step.is-done .step-num {
      background: var(--ok);
      color: #fff;
    }
    .step h3 {
      margin: 0 0 2px;
      font-size: .98rem;
      font-weight: 700;
    }
    .step p {
      margin: 0;
      color: var(--muted);
      font-size: .88rem;
      line-height: 1.4;
    }

    .paste-box {
      margin-top: auto;
      padding-top: 6px;
      border-top: 1px solid var(--line);
    }
    .paste-box label {
      display: block;
      font-size: .82rem;
      font-weight: 700;
      letter-spacing: .02em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 8px;
    }
    .paste-box input {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px 14px;
      font: inherit;
      background: #f7f4ee;
      color: var(--ink);
      outline: none;
      transition: border-color .15s ease, box-shadow .15s ease;
    }
    .paste-box input:focus {
      border-color: rgba(217, 119, 6, .55);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }
    .paste-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 10px;
    }
    .btn {
      border: 0;
      border-radius: 12px;
      padding: 12px 14px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      transition: transform .15s ease, filter .15s ease, background .15s ease;
    }
    .btn:active { transform: translateY(1px); }
    .btn-primary {
      background: var(--ink);
      color: #fff;
      grid-column: 1 / -1;
    }
    .btn-primary:hover { filter: brightness(1.08); }
    .btn-primary:disabled {
      opacity: .45;
      cursor: not-allowed;
      filter: none;
    }
    .btn-ghost {
      background: transparent;
      color: var(--ink-soft);
      border: 1px solid var(--line);
    }
    .status {
      min-height: 1.3em;
      margin-top: 10px;
      font-size: .88rem;
      color: var(--muted);
    }
    .status.ok { color: var(--ok); font-weight: 600; }
    .status.err { color: #b42318; font-weight: 600; }

    .studio {
      position: relative;
      overflow: hidden;
      min-height: 520px;
      display: flex;
      flex-direction: column;
    }
    .studio-chrome {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      background: linear-gradient(180deg, #fff 0%, #f6f2ea 100%);
    }
    .dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: #d9d2c5;
    }
    .dot:nth-child(1) { background: #e8a598; }
    .dot:nth-child(2) { background: #e6c27a; }
    .dot:nth-child(3) { background: #9fbf9a; }
    .url-pill {
      flex: 1;
      margin-left: 6px;
      border-radius: 999px;
      background: #efece5;
      color: var(--muted);
      font-size: .85rem;
      padding: 8px 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .studio-body {
      flex: 1;
      position: relative;
      background:
        linear-gradient(145deg, rgba(20,24,31,.03), transparent 40%),
        repeating-linear-gradient(
          -12deg,
          rgba(20,24,31,.025) 0 1px,
          transparent 1px 14px
        ),
        #faf7f1;
      display: grid;
      place-items: center;
      padding: 28px 20px;
    }
    .hero-card {
      width: min(420px, 100%);
      text-align: center;
      animation: floatIn .6s ease .1s both;
    }
    .hero-card h2 {
      font-family: var(--display);
      font-size: clamp(1.6rem, 3.5vw, 2.1rem);
      letter-spacing: -.03em;
      margin: 0 0 10px;
      line-height: 1.1;
    }
    .hero-card p {
      margin: 0 0 22px;
      color: var(--ink-soft);
      line-height: 1.5;
    }
    .btn-launch {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-width: 240px;
      padding: 15px 22px;
      border: 0;
      border-radius: 14px;
      background: var(--accent);
      color: #fff;
      font: inherit;
      font-weight: 800;
      font-size: 1.02rem;
      cursor: pointer;
      box-shadow: 0 10px 28px rgba(217, 119, 6, 0.28);
      transition: transform .15s ease, box-shadow .15s ease;
    }
    .btn-launch:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 34px rgba(217, 119, 6, 0.34);
    }
    .tiny {
      margin-top: 14px;
      font-size: .84rem;
      color: var(--muted);
    }
    .preview {
      display: none;
      margin-top: 18px;
      padding: 14px;
      border-radius: 14px;
      background: var(--ok-soft);
      border: 1px solid rgba(31, 122, 69, 0.25);
      text-align: left;
      animation: rise .35s ease both;
    }
    .preview.show { display: block; }
    .preview strong { display: block; margin-bottom: 4px; color: var(--ok); }
    .preview code {
      display: block;
      font-size: .78rem;
      word-break: break-all;
      color: var(--ink-soft);
      margin-top: 6px;
    }

    @keyframes rise {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: none; }
    }
    @keyframes floatIn {
      from { opacity: 0; transform: translateY(16px) scale(.98); }
      to { opacity: 1; transform: none; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="top">
      <div>
        <h1 class="brand"><a href="/inicio.php" style="color:inherit;text-decoration:none">Mafra <span>Maker</span></a></h1>
        <p class="sub">Escolha o modelo no MakerWorld e traga o link para o seu orçamento. Simples: pesquisar → copiar → usar.</p>
        <p class="sub" style="margin-top:8px;font-size:.9rem">
          <a href="/" style="color:inherit">Site CCSKF</a> ·
          <a href="/inicio.php" style="color:inherit">Início Maker</a> ·
          <a href="/orcamento.php" style="color:inherit">Orçamento</a> ·
          <a href="/orcamento.php" style="color:inherit">Voltar ao formulário</a>
        </p>
      </div>
      <a class="back" href="/orcamento.php">Voltar ao formulário</a>
    </header>

    <div class="layout">
      <aside class="rail">
        <ol class="steps">
          <li class="step is-active" data-step="1">
            <div class="step-num">1</div>
            <div>
              <h3>Abrir o MakerWorld</h3>
              <p>Pesquise modelos, filtros e favoritos na janela do MakerWorld.</p>
            </div>
          </li>
          <li class="step" data-step="2">
            <div class="step-num">2</div>
            <div>
              <h3>Copiar o link do modelo</h3>
              <p>Abra a página do modelo e copie o endereço do navegador.</p>
            </div>
          </li>
          <li class="step" data-step="3">
            <div class="step-num">3</div>
            <div>
              <h3>Usar neste pedido</h3>
              <p>Cole aqui e confirme. Voltamos ao formulário com o link pronto.</p>
            </div>
          </li>
        </ol>

        <div class="paste-box">
          <label for="link">Link do modelo</label>
          <input id="link" type="url" placeholder="https://makerworld.com/pt/models/…" autocomplete="off" inputmode="url">
          <div class="paste-actions">
            <button type="button" class="btn btn-ghost" id="btn-paste">Colar</button>
            <button type="button" class="btn btn-ghost" id="btn-open">Abrir MW</button>
            <button type="button" class="btn btn-primary" id="btn-use" disabled>Usar este modelo</button>
          </div>
          <div class="status" id="status">Clique em “Começar a escolher” para abrir o MakerWorld.</div>
        </div>
      </aside>

      <section class="studio" aria-label="Estúdio MakerWorld">
        <div class="studio-chrome" aria-hidden="true">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          <div class="url-pill" id="url-pill">makerworld.com · catálogo de modelos</div>
        </div>
        <div class="studio-body">
          <div class="hero-card">
            <h2>Escolha o modelo como se estivesse aqui</h2>
            <p>Abrimos o MakerWorld numa janela dedicada para você navegar com calma. Quando achar o modelo certo, volte e cole o link.</p>
            <button type="button" class="btn-launch" id="btn-launch">Começar a escolher</button>
            <p class="tiny">Dica: no celular, o MakerWorld abre em outra aba — depois volte e cole o link.</p>
            <div class="preview" id="preview">
              <strong>Modelo pronto para usar</strong>
              <div>Link válido detectado.</div>
              <code id="preview-url"></code>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>

<script>
(function () {
  var dest = "\/orcamento.php";
  var MW = 'https://makerworld.com/';
  var link = document.getElementById('link');
  var statusEl = document.getElementById('status');
  var btnUse = document.getElementById('btn-use');
  var preview = document.getElementById('preview');
  var previewUrl = document.getElementById('preview-url');
  var urlPill = document.getElementById('url-pill');
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
  var popup = null;

  function setStatus(text, kind) {
    statusEl.textContent = text || '';
    statusEl.className = 'status' + (kind ? (' ' + kind) : '');
  }

  function setStep(n) {
    steps.forEach(function (el) {
      var s = Number(el.getAttribute('data-step'));
      el.classList.toggle('is-active', s === n);
      el.classList.toggle('is-done', s < n);
    });
  }

  function isMw(url) {
    try {
      var u = new URL(url);
      return /(^|\.)makerworld\.com$/i.test(u.hostname) || /(^|\.)bambulab\.com$/i.test(u.hostname);
    } catch (e) {
      return false;
    }
  }

  function refreshFromInput() {
    var url = (link.value || '').trim();
    if (!url) {
      btnUse.disabled = true;
      preview.classList.remove('show');
      return false;
    }
    if (!/^https?:\/\//i.test(url)) {
      btnUse.disabled = true;
      preview.classList.remove('show');
      setStatus('O link precisa começar com https://', 'err');
      setStep(2);
      return false;
    }
    if (!isMw(url)) {
      btnUse.disabled = false;
      preview.classList.add('show');
      previewUrl.textContent = url;
      setStatus('Link aceito (fora do MakerWorld). Você ainda pode usar.', 'ok');
      setStep(3);
      urlPill.textContent = url.replace(/^https?:\/\//, '');
      return true;
    }
    btnUse.disabled = false;
    preview.classList.add('show');
    previewUrl.textContent = url;
    setStatus('Modelo detectado. Clique em “Usar este modelo”.', 'ok');
    setStep(3);
    urlPill.textContent = url.replace(/^https?:\/\//, '');
    return true;
  }

  function openMw() {
    setStep(1);
    popup = window.open(MW, 'mafraMakerWorld', 'noopener,noreferrer,width=1240,height=860');
    if (!popup) {
      setStatus('Permita pop-up ou abra o MakerWorld manualmente.', 'err');
      window.open(MW, '_blank', 'noopener,noreferrer');
      return;
    }
    try { popup.focus(); } catch (e) {}
    setStep(2);
    setStatus('MakerWorld aberto. Escolha o modelo, copie o link e cole aqui.');
    link.focus();
  }

  function useLink() {
    var url = (link.value || '').trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      setStatus('Cole um link válido antes de continuar.', 'err');
      return;
    }
    try {
      sessionStorage.setItem('mafra_mw_link', url);
      sessionStorage.setItem('mafra_mw_ts', String(Date.now()));
    } catch (e) {}
    setStatus('Levantando o formulário…', 'ok');
    window.location.href = dest + (dest.indexOf('?') >= 0 ? '&' : '?') + 'mw=' + encodeURIComponent(url);
  }

  document.getElementById('btn-launch').addEventListener('click', openMw);
  document.getElementById('btn-open').addEventListener('click', openMw);
  document.getElementById('btn-use').addEventListener('click', useLink);
  document.getElementById('btn-paste').addEventListener('click', function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) {
      link.focus();
      setStatus('Cole com Ctrl/Cmd+V no campo de link.', 'err');
      return;
    }
    navigator.clipboard.readText().then(function (t) {
      t = (t || '').trim();
      if (!t) {
        setStatus('Nada na área de transferência.', 'err');
        return;
      }
      link.value = t;
      refreshFromInput();
    }).catch(function () {
      link.focus();
      setStatus('Não deu para ler a área de transferência. Cole manualmente (Ctrl/Cmd+V).', 'err');
    });
  });

  link.addEventListener('input', refreshFromInput);
  link.addEventListener('paste', function () { setTimeout(refreshFromInput, 0); });
  link.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); useLink(); }
  });

  window.addEventListener('focus', function () {
    if (!navigator.clipboard || !navigator.clipboard.readText) return;
    if ((link.value || '').trim()) return;
    navigator.clipboard.readText().then(function (t) {
      t = (t || '').trim();
      if (isMw(t)) {
        link.value = t;
        refreshFromInput();
        setStatus('Link do MakerWorld capturado automaticamente.', 'ok');
      }
    }).catch(function () {});
  });

  var params = new URLSearchParams(window.location.search);
  if (params.get('mw')) {
    link.value = params.get('mw');
    refreshFromInput();
  }
})();
</script>
</body>
</html>

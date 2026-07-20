<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Orçamento | Mafra Maker</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Syne:wght@600;700;800&display=swap" rel="stylesheet"><script>window.MAKER_WEB_BASE="";</script><link rel="stylesheet" href="/assets/public.css?v=20260717"></head><body class="pub-body"><header class="pub-header"><div class="pub-header-inner"><a class="pub-brand" href="/inicio.php">Mafra <span>Maker</span></a><nav class="pub-nav"><a href="/inicio.php">Início</a><a href="/orcamento.php" class="is-active">Orçamento</a><a href="/imprimir.php">Imprimir</a><a href="/explorar-makerworld.php">Modelos</a></nav><div class="pub-header-actions"><a class="pub-link-quiet" href="/login.php">Área interna</a></div></div></header><main class="pub-main"><h1 class="pub-hero-title">Pedir orçamento</h1>
<p class="pub-lead">Descreva o serviço. Se quiser, escolha um modelo no MakerWorld antes.</p>

<p style="margin:0 0 16px;display:grid;gap:10px">
  <a class="pub-tile" style="min-height:auto;padding:14px 16px" href="/explorar-thingiverse.php?voltar=orcamento">
    <strong style="font-size:1.05rem">Buscar no Thingiverse</strong>
    <span>Pesquise modelos e veja a licença antes de orçar</span>
  </a>
  <a class="pub-tile" style="min-height:auto;padding:14px 16px" href="/explorar-makerworld.php?voltar=orcamento">
    <strong style="font-size:1.05rem">Escolher modelo no MakerWorld</strong>
    <span>Abrir MakerWorld e trazer o link para este orçamento</span>
  </a>
</p>

<div id="ok" class="pub-ok">
  <strong>Orçamento recebido!</strong>
  <p id="ok-msg" style="margin:8px 0 0"></p>
</div>

<section class="pub-panel">
  <h2>Formulário</h2>
  <form id="form" class="form-grid" enctype="multipart/form-data">
    <input type="hidden" name="tipo" value="orcamento">
    <label class="full">Seu nome
      <input name="nome" required autocomplete="name">
    </label>
    <label>WhatsApp / telefone
      <input name="telefone" autocomplete="tel" placeholder="(16) 9…">
    </label>
    <label>E-mail
      <input name="email" type="email" autocomplete="email">
    </label>
    <label class="full">O que você precisa?
      <input name="titulo" required placeholder="Ex.: 10 chaveiros personalizados">
    </label>
    <label class="full">Descrição / detalhes
      <textarea name="descricao" rows="4" required placeholder="Tamanho, material, cor, prazo, uso…"></textarea>
    </label>
    <label>Quantidade
      <input name="quantidade" type="number" min="1" max="500" value="1">
    </label>
    <label>Serviço
      <select name="material">
        <option value="">A definir</option>
        <option>PLA</option>
        <option>PETG</option>
        <option>ABS</option>
        <option>TPU</option>
        <option>Resina</option>
        <option>Corte a laser</option>
        <option>Outro</option>
      </select>
    </label>
    <label class="full">Link MakerWorld / Drive (opcional)
      <input name="makerworld_url" id="mw-url" type="url" placeholder="https://makerworld.com/…">
    </label>
    <label class="full">Arquivo (opcional)
      <input name="arquivo" type="file" accept=".stl,.3mf,.obj,.step,.stp,.zip,.pdf,.png,.jpg,.jpeg">
    </label>
    <div class="honeypot" aria-hidden="true">
      <input name="website" tabindex="-1" autocomplete="off">
    </div>
    <button class="full" type="submit" id="btn">Pedir orçamento</button>
    <p class="full muted" id="msg"></p>
  </form>
</section>
<script>
(function () {
  var form = document.getElementById('form');
  var msg = document.getElementById('msg');
  var btn = document.getElementById('btn');
  var mw = document.getElementById('mw-url');
  try {
    var params = new URLSearchParams(window.location.search);
    var fromQ = params.get('mw');
    var fromS = sessionStorage.getItem('mafra_mw_link');
    if (fromQ) mw.value = fromQ;
    else if (fromS) mw.value = fromS;
    if (fromQ || fromS) sessionStorage.removeItem('mafra_mw_link');
  } catch (e) {}
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fd = new FormData(form);
    if (!(fd.get('telefone') || '').toString().trim() && !(fd.get('email') || '').toString().trim()) {
      msg.textContent = 'Informe telefone ou e-mail.';
      return;
    }
    msg.textContent = 'Enviando…';
    btn.disabled = true;
    fetch((window.MAKER_WEB_BASE||'')+'/api/v1/publico/impressao', {
      method: 'POST', body: fd, headers: { 'Accept': 'application/json' }
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || j.sucesso === false) throw new Error(j.erro || j.mensagem || ('HTTP ' + r.status));
        return j;
      });
    }).then(function (res) {
      var ped = res.pedido || {};
      document.getElementById('ok').classList.add('show');
      document.getElementById('ok-msg').textContent =
        (res.mensagem || 'Recebido.') + (ped.public_code ? ' Código: ' + ped.public_code : '');
      form.reset();
      form.querySelector('[name=tipo]').value = 'orcamento';
      form.querySelector('[name=quantidade]').value = '1';
      msg.textContent = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(function (err) {
      msg.textContent = err.message || String(err);
    }).then(function () { btn.disabled = false; });
  });
})();
</script>
</main><footer class="pub-footer"><div class="pub-footer-inner"><span>Mafra Maker · impressão 3D e orçamentos</span><a href="/login.php">Gestão</a></div></footer></body></html>
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Entrar | Mafra Maker</title>
  <style>
    body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#111;color:#eee}
    .box{width:min(420px,92vw);background:#1c1c1c;border:1px solid #333;border-radius:14px;padding:28px}
    label{display:grid;gap:6px;margin-bottom:12px;font-size:14px;color:#ccc}
    input{padding:10px;border-radius:8px;border:1px solid #555;background:#0d0d0d;color:#eee;font:inherit}
    button[type=submit]{width:100%;padding:12px;border:0;border-radius:8px;background:#2d6a4f;color:#fff;font:inherit;cursor:pointer;margin-top:8px}
    .err{color:#f66;margin-bottom:12px}
    .hint{font-size:13px;color:#aaa;margin:-6px 0 12px}
    .already{margin-bottom:16px;padding:12px;border:1px solid #444;border-radius:10px}
    .already a{color:#8cf;margin-right:12px}
  </style>
</head>
<body>
  <form class="box" method="post" action="/login.php">
    <h1>Mafra Maker</h1>
    <p class="hint">Portal admin — criar, editar e consultar pedidos.</p>
            <label>Usuário<input name="user" required autocomplete="username" value="mafra"></label>
    <p class="hint">Use <code>mafra</code> ou <code>luciana</code></p>
    <label>Senha<input type="password" name="password" required autocomplete="current-password"></label>
    <button type="submit">Entrar</button>
  </form>
</body>
</html>

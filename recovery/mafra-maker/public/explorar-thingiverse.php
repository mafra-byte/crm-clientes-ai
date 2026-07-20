<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Thingiverse | Mafra Maker</title>
  <script>window.MAKER_WEB_BASE="";</script>  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --ink: #14181f; --muted: #6b7685; --line: rgba(20,24,31,.12);
      --paper: #f3f1ec; --panel: #fffdf9; --accent: #0f766e;
      --accent-soft: rgba(15,118,110,.12); --shadow: 0 18px 50px rgba(20,24,31,.08);
      --radius: 18px; --font: "Manrope", sans-serif; --display: "Syne", sans-serif;
      --red: #b91c1c; --yellow: #a16207; --green: #15803d;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; font-family: var(--font); color: var(--ink);
      background:
        radial-gradient(1000px 500px at 0% -10%, rgba(15,118,110,.14), transparent 55%),
        linear-gradient(180deg, #ebe8e1 0%, var(--paper) 50%, #e4dfd4 100%);
      min-height: 100vh;
    }
    .shell { width: min(1100px, calc(100% - 28px)); margin: 0 auto; padding: 22px 0 40px; }
    .top { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
    .brand { font-family: var(--display); font-size: clamp(1.6rem, 3.5vw, 2.2rem); font-weight: 800; letter-spacing: -.04em; margin: 0; }
    .brand span { color: var(--accent); }
    .sub { margin: 6px 0 0; color: var(--muted); max-width: 36rem; line-height: 1.45; }
    .back { color: var(--ink); text-decoration: none; font-weight: 600; align-self: center; }
    .search {
      display: flex; gap: 10px; flex-wrap: wrap; background: var(--panel);
      border: 1px solid var(--line); border-radius: var(--radius); padding: 14px;
      box-shadow: var(--shadow); margin-bottom: 18px;
    }
    .search input {
      flex: 1 1 220px; border: 1px solid var(--line); border-radius: 12px;
      padding: 12px 14px; font: inherit; background: #fff;
    }
    .search button {
      border: 0; border-radius: 12px; padding: 12px 18px; font: inherit; font-weight: 700;
      background: var(--accent); color: #fff; cursor: pointer;
    }
    .search button:disabled { opacity: .5; cursor: wait; }
    .status { color: var(--muted); margin: 0 0 14px; min-height: 1.3em; }
    .status.err { color: var(--red); }
    .grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px;
    }
    .card {
      background: var(--panel); border: 1px solid var(--line); border-radius: 16px;
      overflow: hidden; box-shadow: var(--shadow); display: flex; flex-direction: column;
    }
    .card img { width: 100%; aspect-ratio: 1; object-fit: cover; background: #e8e4dc; display: block; }
    .card .body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
    .card h3 { margin: 0; font-size: 1rem; line-height: 1.25; }
    .meta { margin: 0; color: var(--muted); font-size: .85rem; }
    .badge {
      display: inline-block; font-size: .72rem; font-weight: 700; padding: 3px 8px;
      border-radius: 999px; width: fit-content;
    }
    .badge.green { background: rgba(21,128,61,.12); color: var(--green); }
    .badge.yellow { background: rgba(161,98,7,.12); color: var(--yellow); }
    .badge.red { background: rgba(185,28,28,.12); color: var(--red); }
    .card .actions { display: flex; gap: 8px; margin-top: auto; }
    .card .actions a, .card .actions button {
      flex: 1; text-align: center; text-decoration: none; font: inherit; font-weight: 700;
      font-size: .88rem; border-radius: 10px; padding: 9px 10px; cursor: pointer; border: 1px solid var(--line);
      background: #fff; color: var(--ink);
    }
    .card .actions button.primary { background: var(--accent); color: #fff; border-color: transparent; }
    .card .actions button.primary:disabled { opacity: .45; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="shell">
    <div class="top">
      <div>
        <h1 class="brand">Mafra <span>Maker</span></h1>
        <p class="sub">Busque no Thingiverse e leve o modelo para o <br />
<b>Fatal error</b>:  Uncaught Error: Call to undefined function h() in /home/ccskf/www/maker/explorar-thingiverse.php:92
Stack trace:
#0 {main}
  thrown in <b>/home/ccskf/www/maker/explorar-thingiverse.php</b> on line <b>92</b><br />

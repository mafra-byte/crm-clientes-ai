# Sync notebook Windows → Contabo `213.199.51.121`

O portal que você usa no dia a dia **não** é o CRM Next.js (`protheus.ccskf.net`).  
É o **Portal CCSKF PHP** (`ccskf.com.br/cliente` / `portal-integracao`), com fontes AdvPL no **`custom.rpo` do Windows**.

## Estado atual no Contabo (2026-09-04)

| Item | Contabo | Notebook (fonte da verdade) |
|------|---------|-----------------------------|
| Portal PHP | `/var/www/portal-integracao` (cópia Aug/2026) | `C:\Totvs\Protheus_1212410\Protheus\my projects\portal-integracao` |
| `custom.rpo` | **vazio (0 bytes)** | RPO custom com os desenvolvimentos |
| WireGuard `10.66.66.2` | peer configurado, **offline** | precisa conectar a VPN WG |
| REST AppServer `:8081` | depende do `HTTPJOB` | no Windows via IIS/túnel `:18080` |
| Site público atual | KingHost `ccskf.com.br` | — |

Sem o `custom.rpo` do notebook, o Contabo **não** tem os programas custom (REST PRTP*, etc.).

## O que fazer no Windows (obrigatório)

1. Ajuste o caminho do RPO se necessário e rode:

```powershell
powershell -ExecutionPolicy Bypass -File \\?\C:\caminho\enviar_do_windows.ps1
```

Cópia do script na VPS:

`/totvs/protheus_2410/tools/sync_from_windows/enviar_do_windows.ps1`

Ou manualmente:

```powershell
# 1) custom.rpo (CRÍTICO)
scp "C:\Totvs\Protheus_1212410\Protheus\bin\appserver\custom.rpo" `
  root@213.199.51.121:/totvs/protheus_2410/tools/sync_from_windows/incoming/custom.rpo

# 2) aplicar na VPS
ssh root@213.199.51.121 /totvs/protheus_2410/tools/sync_from_windows/aplicar_custom_rpo.sh

# 3) portal PHP (opcional se a pasta local estiver mais nova)
Compress-Archive -Path "C:\Totvs\Protheus_1212410\Protheus\my projects\portal-integracao" `
  -DestinationPath "$env:TEMP\portal-integracao.zip" -Force
scp "$env:TEMP\portal-integracao.zip" `
  root@213.199.51.121:/totvs/protheus_2410/tools/sync_from_windows/incoming/portal-integracao.zip
ssh root@213.199.51.121 /totvs/protheus_2410/tools/sync_from_windows/aplicar_portal.sh
```

## DNS (para o portal PHP na VPS)

Hoje `portal.ccskf.com.br` / `ccskf.com.br` apontam para a **KingHost**, não para o Contabo.

Para servir o portal no Contabo:

- Crie/altere o A de `portal.ccskf.com.br` → `213.199.51.121`
- Na VPS: `certbot --nginx -d portal.ccskf.com.br`

Enquanto o DNS não muda, o vhost já responde no Contabo com:

`curl -H "Host: portal.ccskf.com.br" http://213.199.51.121/cliente/login.php`

## WireGuard

Peer esperado: notebook `10.66.66.2` ↔ Contabo `10.66.66.1`.  
Com o handshake ativo, dá para puxar arquivos sem SCP público.

## Não confundir

| URL | App |
|-----|-----|
| https://ccskf.com.br/cliente/login.php | Portal PHP CCSKF (KingHost) |
| https://protheus.ccskf.net | CRM Next.js (outro projeto) |
| https://portal.ccskf.com.br (após DNS) | Portal PHP no Contabo |

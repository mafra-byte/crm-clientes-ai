# Ressuscitar Protheus no Contabo (`213.199.51.121`)

Procedimento executado em **2026-09-04**. Objetivo: religar o ERP sem derrubar Casamax, Davi Caminhões nem os outros portais do mesmo host.

## Regra de ouro — não quebrar outros portais

| Pode mexer | Não mexer |
|------------|-----------|
| `protheus-license` / `protheus-dbaccess` / `protheus-appserver` | Docker Casamax (`3050–3053`, `3333`) e Davi (`3003`) |
| PostgreSQL DB `protheus` (desbloqueio Admin) | `nginx` global / outros `sites-enabled` |
| Túnel SSH que **só** rouba portas do Protheus (`4321`, `5555`, `7890`, `8020`) | Host `161.97.185.151` |
| | PM2 `agendamento`, `noite-*` (portal CRM `protheus` pode ficar online) |

Smoke rápido **antes e depois** de qualquer restart do ERP:

```bash
for host in casamax.i16br.com davicaminhoes.i16br.com casamax.fornecedores.i16br.com; do
  curl -sk -o /dev/null -w "$host=%{http_code}\n" -H "Host: $host" https://127.0.0.1/
done
```

## Ordem de subida

```bash
systemctl start protheus-license
sleep 4
systemctl start protheus-dbaccess
sleep 5
systemctl start protheus-appserver
```

Validação:

| Serviço | Porta | Esperado |
|---------|-------|----------|
| License | `5555`, `2234`, `8020` | `appsrvlinux` (license) |
| DBAccess | `7890` | `dbaccess64` |
| AppServer | `1234`, `4321`, `8081` | `appsrvlinux` (protheus_2410) |

URLs: `https://protheus.ccskf.net/webapp/` (HTTP 200) · License monitor `http://127.0.0.1:8020/`.

## Problema típico: porta 4321 ocupada por SSH

Sintoma: `WebApp failed to start` e `ss` mostra `sshd` em `4321` (não `appsrvlinux`).

Causa vista em 2026-09-04: reverse tunnel de `189.110.42.247` reassumindo `4321`/`5555`/`7890`/`8020` via autossh. **Não** é o backend do Casamax/Davi (esses usam `docker-proxy`).

Mitigação no host (já aplicada):

`/etc/ssh/sshd_config.d/99-block-protheus-port-steal.conf`

```
Match Address 189.110.42.247
    AllowTcpForwarding local
    PermitListen none
```

Depois: `sshd -t && systemctl reload ssh` → matar só a sessão `sshd` que escuta `4321` → `systemctl restart protheus-appserver`.

## Senha / bloqueio Admin

O Admin (`sys_usr` id `000000`, código `Administrador`) costuma ter `usr_msblql=2` (**não** bloqueado no padrão TOTVS: `1`=Sim, `2`=Não). O que trava login costuma ser `usr_typeblock` / tentativas / senha esquecida.

Desbloqueio (só flags; não apaga usuário):

```sql
UPDATE sys_usr SET
  usr_msblql = '2',
  usr_typeblock = ' ',
  usr_qtdtentblq = 0,
  usr_datablq = '        ',
  usr_horablq = '        ',
  usr_dttentblq = '        ',
  usr_hrtentblq = '        '
WHERE usr_id = '000000';
```

Login WebApp (sandbox):

1. Usuário `Admin` · tentar senha `Protheus.123`
2. Se falhar: senha = **um espaço** (primeiro acesso PO UI) e redefinir para `Protheus.123`
3. Automação no servidor: `/totvs/protheus_2410/tools/set_password.js`

## Estado após ressurreição (2026-09-04)

- License + DBAccess + AppServer: **active** e **enabled** no systemd  
- WebApp `4321` / HTTPS `/webapp/`: **200**  
- REST `8081`: escuta (comportamento OAuth/timeouts = tema separado)  
- Casamax / Davi / agendasync: **200** intactos  
- Portal CRM PM2 `protheus`: online  

## Erro: “Sistema operacional não homologado” (Ubuntu)

TDN: [Validações de Banco e SO — 12.1.2410](https://tdn.totvs.com/pages/releaseview.action?pageId=848821627).

No Ubuntu o Protheus bloqueia módulos se o tipo de ambiente **não** for **Desenvolvimento**.  
Tipo fica em `SYS_APP_PARAM` / `TypeEnvironment` (valor criptografado) e se altera no Configurador (**CFGA750**).

### Lab no `213` (temporário)

1. Spoof de identidade OL8 só em `/etc/os-release` (arquivo real; `/usr/lib/os-release` permanece Ubuntu).  
2. Entrar no **Configurador** (`SIGACFG`) e marcar tipo **Desenvolvimento**.  
3. Restaurar Ubuntu: `/totvs/protheus_2410/tools/restore_ubuntu_os_release.sh` e `systemctl restart protheus-appserver`.  
4. Com DEV gravado, a validação de SO deixa de aplicar (TDN).

**Não** use spoof em produção. Caminho correto TOTVS: Oracle Linux 8 / RHEL 8.  
**Não** reinicie nginx/Docker/Casamax/Davi para isso.

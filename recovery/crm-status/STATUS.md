# Status CRM Clientela (recuperação)

## No GitHub (salvo)
- PR draft: https://github.com/mafra-byte/crm-clientes-ai/pull/1
- Branch: `cursor/mercado-livre-integracao-77e0`
- Conteúdo: CRM Next.js + Prisma + integração Mercado Livre (~47 arquivos)

## No VPS (precisa confirmar / copiar)
- Caminho no IDE: `/home/administrador/crm-clientes-ai/`
- Evidência: existe `migrations/029_testes_homologacao.sql` — indica CRM bem mais avançado que o PR do GitHub
- AÇÃO: no VPS rodar:

```bash
cd /home/administrador/crm-clientes-ai
git status
git remote -v
# Se não tiver remote, criar backup imediato:
tar czvf ~/crm-clientes-ai-backup-$(date +%Y%m%d).tar.gz .
```

## Relação com Maker
Projetos diferentes. Maker = KingHost `maker/`. CRM = VPS `/home/administrador/crm-clientes-ai` + este repo.

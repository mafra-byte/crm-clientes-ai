#!/usr/bin/env bash
# Rodar NO VPS (SSH como administrador)
set -euo pipefail
STAMP=$(date +%Y%m%d-%H%M%S)
DEST="$HOME/backups-ccskf-$STAMP"
mkdir -p "$DEST"
echo "Backup em $DEST"
for d in \
  "$HOME/crm-clientes-ai" \
  "$HOME/maker" \
  "$HOME/mafra-maker" \
  "$HOME/www/maker" \
  "/var/www/maker" \
  "/home/administrador/crm-clientes-ai" \
  "/home/administrador/maker"; do
  if [ -d "$d" ]; then
    echo "Achou: $d"
    tar czvf "$DEST/$(basename "$d").tar.gz" -C "$(dirname "$d")" "$(basename "$d")"
  fi
done
ls -lah "$DEST"
echo "Pronto. Baixe $DEST para o PC e suba no GitHub."

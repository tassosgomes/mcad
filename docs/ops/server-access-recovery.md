# Runbook — Recuperação de acesso ao servidor mcad

> Host: `161.97.71.19` (vmi3283566) — Ubuntu 24.04 em VPS Contabo (QEMU)
> Estado de acesso atual (2026-05-28):
> - SSH por chave Ed25519 (`~/.ssh/id_ed25519_mcad`), comentário `gomestasso@gmail.com`
> - `PasswordAuthentication no`, `PermitRootLogin prohibit-password`
> - Senha do root pode ainda existir mas é inútil para SSH; só serve para console direto

## Cenários cobertos

| Cenário | Severidade | Caminho de recuperação |
|---|---|---|
| Perdi `~/.ssh/id_ed25519_mcad` mas tenho backup no cofre Zoho | Baixa | [§A — Restaurar de backup](#a-restaurar-chave-de-backup) |
| Perdi o arquivo E não tenho backup | Alta | [§B — Console VNC da Contabo](#b-rescue-via-console-vnc-contabo) |
| Servidor não inicia / kernel panic / fsck | Alta | [§B — Console VNC da Contabo](#b-rescue-via-console-vnc-contabo) |
| Travei o sshd com config inválida | Alta | [§B — Console VNC da Contabo](#b-rescue-via-console-vnc-contabo) |
| SSH funciona mas Portainer está fora | Média | [§C — Restart Portainer via SSH](#c-restart-portainer-via-ssh) |
| Conta Portainer admin perdida | Média | [§D — Reset admin do Portainer](#d-reset-do-admin-do-portainer) |
| Perdi acesso ao app TOTP do Portainer | Média | [§D.1 — Recovery 2FA](#d1-recovery-de-2fa-portainer) |
| Vault selado após restart | Média | [§E — Re-unseal](#e-re-unseal-vault) |
| Banido por fail2ban (acidente) | Baixa | [§F — Unban fail2ban](#f-unban-fail2ban) |
| UFW travou meu acesso | Alta | [§G — Reset UFW pelo console](#g-reset-ufw-pelo-console) |

---

## §A. Restaurar chave de backup

Você guarda a chave privada no cofre Zoho (campo "secure note" ou "SSH key"). Para restaurar:

```bash
# 1. Recuperar conteúdo do cofre Zoho e salvar em arquivo
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat > ~/.ssh/id_ed25519_mcad <<'EOF'
-----BEGIN OPENSSH PRIVATE KEY-----
<conteúdo do cofre>
-----END OPENSSH PRIVATE KEY-----
EOF
chmod 600 ~/.ssh/id_ed25519_mcad

# 2. Restaurar a public key (pode derivar da privada)
ssh-keygen -y -f ~/.ssh/id_ed25519_mcad > ~/.ssh/id_ed25519_mcad.pub
chmod 644 ~/.ssh/id_ed25519_mcad.pub

# 3. Restaurar ~/.ssh/config (ver formato em "Aliases SSH" abaixo)

# 4. Testar
ssh mcad-server 'whoami; date'
```

Fingerprint esperado: `SHA256:m7cB9ot9DHljMP/KyGzDP6uvXNCs8yu6oYVHJDRJV18`

---

## §B. Rescue via console VNC (Contabo)

Quando você não consegue chegar via SSH de jeito nenhum.

### B.1 — Acessar o console

1. Login em https://my.contabo.com
2. Listar serviços → selecionar o VPS `vmi3283566`
3. Botão "VNC" (ou "Cloud-Init" → "VNC Console") → abre uma sessão de console no browser
4. Você vê o prompt de login `vmi3283566 login:` direto na tela do servidor (kernel/init, não passa por SSH)

### B.2 — Entrar via senha de root

A senha do root ainda permite login pelo console (porque `PermitRootLogin prohibit-password` só vale para SSH, não para getty/console local). Senha original: a do `.env_linux` antes da limpeza (ou a nova se você já trocou).

Se a senha do root também foi perdida ou não funciona, vá para [B.3 — Boot em modo single-user].

### B.3 — Boot em modo single-user (caso a senha de root também não funcione)

1. No console VNC, reinicie o servidor (botão "Power" / "Reboot" no painel Contabo)
2. Na tela do GRUB (aparece por ~3 segundos), pressione `e` para editar
3. Encontre a linha que começa com `linux /boot/vmlinuz-...` (com `ro` no meio)
4. Substitua `ro` por `rw init=/bin/bash` (ou adicione no final: `single`)
5. `Ctrl+X` para boot com a alteração
6. Você cai num shell root sem precisar de senha
7. Resetar a senha do root:
   ```bash
   mount -o remount,rw /
   passwd root
   # ... digite nova senha 2x
   sync
   exec /sbin/init   # ou reboot -f
   ```

### B.4 — Reinstalar chave SSH via console

Após estar logado no console (B.2 ou B.3):

```bash
# 1. Editar authorized_keys do root
mkdir -p /root/.ssh
chmod 700 /root/.ssh

# Limpar chaves antigas se quiser substituir todas, ou append a nova
cat >> /root/.ssh/authorized_keys <<'EOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB2XPgOutz4l9VH6tC2SE2Vu7aBduwLnW1tG8E7/rzUo gomestasso@gmail.com
EOF
chmod 600 /root/.ssh/authorized_keys

# 2. Se você travou o sshd com config ruim, restaurar backup
ls /etc/ssh/sshd_config.bak-* 2>/dev/null
# se existir, copiar de volta:
cp /etc/ssh/sshd_config.bak-pre-hardening-20260528 /etc/ssh/sshd_config
# remover drop-in problemático se for o caso:
# rm /etc/ssh/sshd_config.d/01-mcad-hardening.conf

# 3. Reload sshd
sshd -t  # validar sintaxe
systemctl restart ssh

# 4. Testar da sua máquina (sem fechar a sessão VNC ainda):
# ssh mcad-server 'echo OK'
```

### B.5 — Recuperação mais radical: rescue system da Contabo

Se nada acima funcionar (filesystem corrompido, kernel não boota):
1. Painel Contabo → VPS → "Rescue System" → "Activate"
2. Servidor reinicia em ambiente live Linux com acesso temporário
3. Senha temporária é mostrada na interface
4. SSH no rescue, monta o disco real, edita o que precisar, desativa rescue, reinicia normal

---

## §C. Restart Portainer via SSH

Se o Portainer está fora mas SSH funciona:

```bash
ssh mcad-server '
  docker ps --filter "name=portainer" -a
  docker service ls | grep portainer
  # restart forçado da stack:
  docker service update --force portainer_portainer
'
```

---

## §D. Reset do admin do Portainer

Se você perdeu a senha admin do Portainer mas tem SSH:

```bash
ssh mcad-server '
  # 1. Parar o serviço Portainer
  docker service scale portainer_portainer=0
  sleep 5

  # 2. Subir Portainer temporário em modo de admin reset, no mesmo volume
  VOL=$(docker volume ls --filter "name=portainer_portainer_data" -q | head -1)
  docker run --rm -v ${VOL}:/data portainer/helper-reset-password

  # 3. A senha gerada é exibida no stdout. Anotar.

  # 4. Voltar o serviço
  docker service scale portainer_portainer=1
'
# 5. Acessar https://161.97.71.19:9443/ com admin + senha exibida
# 6. Trocar a senha pela UI imediatamente
```

Referência: https://docs.portainer.io/advanced/reset-admin

---

## §D.1 Recovery de 2FA Portainer

Cenário: você habilitou TOTP, mas perdeu o app (celular novo, app desinstalado, etc).

**Caminho 1 — usar Recovery Code (preferido).**
Ao habilitar 2FA, o Portainer mostrou um recovery code de 1 uso. Está guardado no Zoho?
- Na tela de login do Portainer, ao invés do código de 6 dígitos, cole o recovery code
- Após entrar, vá em My account → 2FA → Disable, depois Enable novamente para gerar novo QR + recovery code

**Caminho 2 — desabilitar 2FA do user via banco interno do Portainer.**
Se não tem o recovery code:

```bash
ssh mcad-server '
  # Parar Portainer
  docker service scale portainer_portainer=0
  sleep 5

  # Editar o banco BoltDB diretamente NÃO é trivial.
  # Alternativa: usar a CLI do helper-reset-password que SUBSTITUI o user admin
  # (perde 2FA + reseta senha):
  VOL=$(docker volume ls --filter "name=portainer_portainer_data" -q | head -1)
  docker run --rm -v ${VOL}:/data portainer/helper-reset-password
  # Anotar a nova senha temporaria mostrada

  # Subir Portainer novamente
  docker service scale portainer_portainer=1
'
# Acessar https://161.97.71.19:9443/ com admin + senha nova
# 2FA estara desabilitado para o user reset; reconfigurar imediatamente
```

---

## §E. Re-unseal Vault

Após qualquer restart do container Vault, ele volta selado e precisa de 3 chaves Shamir.

```bash
ssh mcad-server '
  CID=$(docker ps -q --filter "name=vault_vault" --filter "status=running")
  docker exec -e VAULT_ADDR=http://127.0.0.1:8200 $CID vault status
  # deve mostrar Sealed=true

  # 3 unseals consecutivos (chaves do cofre Zoho)
  docker exec -it -e VAULT_ADDR=http://127.0.0.1:8200 $CID vault operator unseal
  # cola a chave 1
  docker exec -it -e VAULT_ADDR=http://127.0.0.1:8200 $CID vault operator unseal
  # cola a chave 2
  docker exec -it -e VAULT_ADDR=http://127.0.0.1:8200 $CID vault operator unseal
  # cola a chave 3

  # Confirmar
  docker exec -e VAULT_ADDR=http://127.0.0.1:8200 $CID vault status
  # deve mostrar Sealed=false
'
```

---

## §F. Unban fail2ban

Se você se banir por acidente (3 tentativas com senha errada num intervalo curto):

```bash
# Via console VNC (porque SSH esta bloqueado para seu IP)
fail2ban-client status sshd               # lista IPs banidos
fail2ban-client set sshd unbanip <SEU_IP>  # remove o ban
```

Para adicionar seu IP permanentemente ao ignoreip:
```bash
# Editar /etc/fail2ban/jail.local na linha 'ignoreip ='
# Adicionar seu IP
systemctl reload fail2ban
```

---

## §G. Reset UFW pelo console

Se as regras do UFW te trancaram fora (raro, mas se você adicionar `deny 22` por acidente, ou similar):

Via console VNC Contabo (§B):

```bash
ufw status numbered                  # listar regras
ufw delete <numero>                  # deletar regra especifica
# OU resetar tudo:
ufw --force reset                    # remove TODAS as regras (volta a allow all)
# OU desabilitar temporariamente:
ufw disable
```

Lembrar de re-habilitar com as regras corretas depois:
```bash
ufw default deny incoming
ufw default allow outgoing
ufw default allow routed
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 9443/tcp
ufw allow 2377/tcp 7946/tcp
ufw allow 7946/udp 4789/udp
ufw --force enable
```

---

## Aliases SSH (para colar em `~/.ssh/config`)

```sshconfig
Host mcad-server
    HostName 161.97.71.19
    User root
    IdentityFile ~/.ssh/id_ed25519_mcad
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3

Host mcad-pg
    HostName 161.97.71.19
    User root
    IdentityFile ~/.ssh/id_ed25519_mcad
    IdentitiesOnly yes
    LocalForward 15432 shared-postgres:5432
    ServerAliveInterval 60

Host mcad-vault
    HostName 161.97.71.19
    User root
    IdentityFile ~/.ssh/id_ed25519_mcad
    IdentitiesOnly yes
    LocalForward 8200 vault:8200
    ServerAliveInterval 60
```

---

## Inventário de credenciais (locais de armazenamento)

| Credencial | Local primário | Local secundário |
|---|---|---|
| Chave privada SSH `id_ed25519_mcad` | `~/.ssh/id_ed25519_mcad` (workstation) | Cofre Zoho |
| Senha de root do servidor | (manual; trocada pelo usuário) | A definir — recomendado cofre Zoho |
| Portainer admin password | `.env_linux:PORTAINER_PASS` | Cofre Zoho recomendado |
| 5 Shamir unseal keys do Vault | Cofre Zoho (5 entradas distintas) | — |
| Root token do Vault | Cofre Zoho | Deve ser revogado após criar tokens admin com TTL |
| Senhas do Postgres (postgres, gestauto, authz, app users) | `/root/ir-postgres-20260528/new_passwords.env` no servidor | `.env_linux` local (apps); Vault Fase 2 (futuro) |
| S3 Access Keys (pg-backup → R2) | `pg-backup` stack env no Portainer | Pendente — rotacionar como recomendação aberta |
| Portainer 2FA Recovery Code | Cofre Zoho (após ativar 2FA) | É de uso único; se usar, gerar novo via My Account |

## Defesa em profundidade — checklist atual

- [x] Postgres não exposto na internet (apenas overlay swarm)
- [x] Oracle do audit-example não exposto (publicação removida)
- [x] Traefik dashboard direto (8088) não exposto (publicação removida)
- [x] Portainer 8000/9000 fechados (só 9443 HTTPS UI)
- [x] Vault não exposto na internet (apenas overlay; acesso por SSH tunnel)
- [x] SSH sem autenticação por senha
- [x] SSH root prohibit-password (chave obrigatória)
- [x] sshd MaxAuthTries=3, LoginGraceTime=30
- [x] Fail2ban com jail sshd + recidive
- [x] UFW ativo com default deny incoming
- [x] Postgres `log_connections=on` + `log_disconnections=on`
- [x] Backup chave SSH no cofre Zoho
- [x] Backup chaves Shamir do Vault no cofre Zoho
- [ ] 2FA no Portainer (instruções entregues; usuário ativa pela UI)
- [ ] Traefik dashboard `traefik.tasso.dev.br` exposto HTTPS sem auth (`api.insecure=true`) — pendente
- [ ] Rotacionar `ORACLE_PASSWORD`, `MINIO_ROOT_PASSWORD`, S3 access keys do pg-backup — pendente
- [ ] Migrar credenciais de env vars para Vault (rollout Fases 2-5)

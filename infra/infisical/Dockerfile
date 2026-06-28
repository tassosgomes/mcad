# Imagem do Infisical Agent + docker-cli (o materialize-secrets.sh chama `docker`).
# A imagem oficial infisical/cli é alpine e não traz o cliente docker.
FROM infisical/cli:latest
RUN apk add --no-cache docker-cli bash coreutils
COPY materialize-secrets.sh /usr/local/bin/materialize-secrets.sh
COPY agent-entrypoint.sh    /usr/local/bin/agent-entrypoint.sh
RUN chmod 0755 /usr/local/bin/materialize-secrets.sh /usr/local/bin/agent-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/agent-entrypoint.sh"]

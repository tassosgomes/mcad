FROM grafana/k6:latest

WORKDIR /scripts

COPY scripts/ .

USER 65534

ENTRYPOINT ["k6", "run", "/scripts/main.js"]

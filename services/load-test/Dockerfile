FROM grafana/k6:latest

WORKDIR /scripts

COPY scripts/ .

ENTRYPOINT ["k6", "run", "/scripts/main.js"]

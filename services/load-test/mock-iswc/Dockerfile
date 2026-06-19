FROM python:3.12-alpine

WORKDIR /app

COPY server.py .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 8090

CMD ["python", "server.py"]

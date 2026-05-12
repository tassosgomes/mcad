# syntax=docker/dockerfile:1.7

FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY pom.xml .
COPY arrecadacao-domain/pom.xml arrecadacao-domain/pom.xml
COPY arrecadacao-application/pom.xml arrecadacao-application/pom.xml
COPY arrecadacao-infra/pom.xml arrecadacao-infra/pom.xml
COPY arrecadacao-api/pom.xml arrecadacao-api/pom.xml
COPY arrecadacao-tests/pom.xml arrecadacao-tests/pom.xml

COPY arrecadacao-domain/src arrecadacao-domain/src
COPY arrecadacao-application/src arrecadacao-application/src
COPY arrecadacao-infra/src arrecadacao-infra/src
COPY arrecadacao-api/src arrecadacao-api/src

RUN --mount=type=secret,id=maven_settings,target=/root/.m2/settings.xml \
    mvn -pl arrecadacao-api -am package -DskipTests

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

ENV JAVA_OPTS="" \
    SERVER_PORT=5003

COPY --from=build /workspace/arrecadacao-api/target/arrecadacao-api-*-exec.jar app.jar

EXPOSE 5003

USER app
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar \"$@\"", "--"]

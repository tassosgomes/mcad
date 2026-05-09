# syntax=docker/dockerfile:1.7

FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

COPY pom.xml .
COPY distribuicao-domain/pom.xml distribuicao-domain/pom.xml
COPY distribuicao-application/pom.xml distribuicao-application/pom.xml
COPY distribuicao-infra/pom.xml distribuicao-infra/pom.xml
COPY distribuicao-api/pom.xml distribuicao-api/pom.xml
COPY distribuicao-tests/pom.xml distribuicao-tests/pom.xml

COPY distribuicao-domain/src distribuicao-domain/src
COPY distribuicao-application/src distribuicao-application/src
COPY distribuicao-infra/src distribuicao-infra/src
COPY distribuicao-api/src distribuicao-api/src

RUN --mount=type=secret,id=maven_settings,target=/root/.m2/settings.xml \
    mvn -pl distribuicao-api -am package -DskipTests

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

ENV JAVA_OPTS="" \
    SERVER_PORT=5004

COPY --from=build /workspace/distribuicao-api/target/distribuicao-api-*.jar app.jar

EXPOSE 5004

USER app
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar \"$@\"", "--"]

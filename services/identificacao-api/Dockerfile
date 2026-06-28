# syntax=docker/dockerfile:1.7
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files first for better layer caching.
COPY services/identificacao-api/1-Services/Identificacao.API/Identificacao.API.csproj services/identificacao-api/1-Services/Identificacao.API/
COPY services/identificacao-api/2-Application/Identificacao.Application/Identificacao.Application.csproj services/identificacao-api/2-Application/Identificacao.Application/
COPY services/identificacao-api/3-Domain/Identificacao.Domain/Identificacao.Domain.csproj services/identificacao-api/3-Domain/Identificacao.Domain/
COPY services/identificacao-api/4-Infra/Identificacao.Infra/Identificacao.Infra.csproj services/identificacao-api/4-Infra/Identificacao.Infra/

WORKDIR /src/services/identificacao-api
RUN --mount=type=secret,id=nuget_config,dst=/root/.nuget/NuGet/NuGet.Config,required=false \
    dotnet restore 1-Services/Identificacao.API/Identificacao.API.csproj

WORKDIR /src
COPY services/identificacao-api/ services/identificacao-api/

WORKDIR /src/services/identificacao-api
RUN dotnet publish 1-Services/Identificacao.API/Identificacao.API.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:5100 \
    DOTNET_RUNNING_IN_CONTAINER=true \
    ASPNETCORE_FORWARDEDHEADERS_ENABLED=true

COPY --from=build /app/publish .
# Entrypoint que carrega segredos via padrão *_FILE (/run/secrets) antes de iniciar a app.
COPY --chmod=0755 services/identificacao-api/docker/entrypoint.sh /app/entrypoint.sh

EXPOSE 5100

USER app
ENTRYPOINT ["/app/entrypoint.sh"]

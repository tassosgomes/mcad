# syntax=docker/dockerfile:1.7
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files first for better layer caching.
COPY services/cadastro-api/Cadastro.sln services/cadastro-api/global.json services/cadastro-api/
COPY services/cadastro-api/1-Services/Cadastro.API/Cadastro.API.csproj services/cadastro-api/1-Services/Cadastro.API/
COPY services/cadastro-api/2-Application/Cadastro.Application/Cadastro.Application.csproj services/cadastro-api/2-Application/Cadastro.Application/
COPY services/cadastro-api/3-Domain/Cadastro.Domain/Cadastro.Domain.csproj services/cadastro-api/3-Domain/Cadastro.Domain/
COPY services/cadastro-api/4-Infra/Cadastro.Infra/Cadastro.Infra.csproj services/cadastro-api/4-Infra/Cadastro.Infra/

WORKDIR /src/services/cadastro-api
RUN --mount=type=secret,id=nuget_config,dst=/root/.nuget/NuGet/NuGet.Config,required=false \
    dotnet restore 1-Services/Cadastro.API/Cadastro.API.csproj

WORKDIR /src
COPY services/cadastro-api/ services/cadastro-api/

WORKDIR /src/services/cadastro-api
RUN dotnet publish 1-Services/Cadastro.API/Cadastro.API.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:5001 \
    DOTNET_RUNNING_IN_CONTAINER=true \
    ASPNETCORE_FORWARDEDHEADERS_ENABLED=true

COPY --from=build /app/publish .
# Entrypoint que carrega segredos via padrão *_FILE (/run/secrets) antes de iniciar a app.
COPY --chmod=0755 services/cadastro-api/docker/entrypoint.sh /app/entrypoint.sh

EXPOSE 5001

USER app
ENTRYPOINT ["/app/entrypoint.sh"]

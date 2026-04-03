FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files first for better layer caching
COPY Identificacao.slnx ./
COPY 1-Services/Identificacao.API/Identificacao.API.csproj 1-Services/Identificacao.API/
COPY 2-Application/Identificacao.Application/Identificacao.Application.csproj 2-Application/Identificacao.Application/
COPY 3-Domain/Identificacao.Domain/Identificacao.Domain.csproj 3-Domain/Identificacao.Domain/
COPY 4-Infra/Identificacao.Infra/Identificacao.Infra.csproj 4-Infra/Identificacao.Infra/
COPY 5-Tests/Identificacao.Tests/Identificacao.Tests.csproj 5-Tests/Identificacao.Tests/

RUN dotnet restore

# Copy remaining source
COPY . .

RUN dotnet publish 1-Services/Identificacao.API/Identificacao.API.csproj \
    -c Release -o /app/publish --no-restore

# ── Runtime ─────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 5100
ENTRYPOINT ["dotnet", "Identificacao.API.dll"]

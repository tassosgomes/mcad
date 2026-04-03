FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy solution and project files first for better layer caching
COPY Cadastro.sln global.json ./
COPY 1-Services/Cadastro.API/Cadastro.API.csproj 1-Services/Cadastro.API/
COPY 2-Application/Cadastro.Application/Cadastro.Application.csproj 2-Application/Cadastro.Application/
COPY 3-Domain/ 3-Domain/
COPY 4-Infra/Cadastro.Infra/Cadastro.Infra.csproj 4-Infra/Cadastro.Infra/
COPY 5-Tests/Cadastro.UnitTests/Cadastro.UnitTests.csproj 5-Tests/Cadastro.UnitTests/
COPY 5-Tests/Cadastro.IntegrationTests/Cadastro.IntegrationTests.csproj 5-Tests/Cadastro.IntegrationTests/

RUN dotnet restore

# Copy remaining source
COPY . .

RUN dotnet publish 1-Services/Cadastro.API/Cadastro.API.csproj \
    -c Release -o /app/publish --no-restore

# ── Runtime ─────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

COPY --from=build /app/publish .

EXPOSE 5001
ENTRYPOINT ["dotnet", "Cadastro.API.dll"]

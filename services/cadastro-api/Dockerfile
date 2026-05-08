# syntax=docker/dockerfile:1.7
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files first for better layer caching.
COPY Cadastro.sln global.json ./
COPY 1-Services/Cadastro.API/Cadastro.API.csproj 1-Services/Cadastro.API/
COPY 2-Application/Cadastro.Application/Cadastro.Application.csproj 2-Application/Cadastro.Application/
COPY 3-Domain/Cadastro.Domain/Cadastro.Domain.csproj 3-Domain/Cadastro.Domain/
COPY 4-Infra/Cadastro.Infra/Cadastro.Infra.csproj 4-Infra/Cadastro.Infra/

RUN --mount=type=secret,id=nuget_config,dst=/root/.nuget/NuGet/NuGet.Config,required=false \
    dotnet restore 1-Services/Cadastro.API/Cadastro.API.csproj

COPY 1-Services/ 1-Services/
COPY 2-Application/ 2-Application/
COPY 3-Domain/ 3-Domain/
COPY 4-Infra/ 4-Infra/

RUN dotnet publish 1-Services/Cadastro.API/Cadastro.API.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:5001 \
    DOTNET_RUNNING_IN_CONTAINER=true \
    ASPNETCORE_FORWARDEDHEADERS_ENABLED=true

COPY --from=build /app/publish .

EXPOSE 5001

USER app
ENTRYPOINT ["dotnet", "Cadastro.API.dll"]

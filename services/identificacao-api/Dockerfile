FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files first for better layer caching.
COPY 1-Services/Identificacao.API/Identificacao.API.csproj 1-Services/Identificacao.API/
COPY 2-Application/Identificacao.Application/Identificacao.Application.csproj 2-Application/Identificacao.Application/
COPY 3-Domain/Identificacao.Domain/Identificacao.Domain.csproj 3-Domain/Identificacao.Domain/
COPY 4-Infra/Identificacao.Infra/Identificacao.Infra.csproj 4-Infra/Identificacao.Infra/

RUN dotnet restore 1-Services/Identificacao.API/Identificacao.API.csproj

COPY 1-Services/ 1-Services/
COPY 2-Application/ 2-Application/
COPY 3-Domain/ 3-Domain/
COPY 4-Infra/ 4-Infra/

RUN dotnet publish 1-Services/Identificacao.API/Identificacao.API.csproj \
    -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:5100 \
    DOTNET_RUNNING_IN_CONTAINER=true \
    ASPNETCORE_FORWARDEDHEADERS_ENABLED=true

COPY --from=build /app/publish .

EXPOSE 5100

USER app
ENTRYPOINT ["dotnet", "Identificacao.API.dll"]

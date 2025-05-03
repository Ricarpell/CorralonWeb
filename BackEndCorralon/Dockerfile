# Imagen base con SDK de .NET 8.0 para construir
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app

# Copiar el archivo .csproj y restaurar dependencias
COPY ApiCorralon.csproj ./
RUN dotnet restore ApiCorralon.csproj

# Copiar el resto del código y compilar
COPY . ./
RUN dotnet publish -c Release -o /app/published

# Imagen base ligera para ejecutar
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/published .
ENTRYPOINT ["dotnet", "ApiCorralon.dll"]
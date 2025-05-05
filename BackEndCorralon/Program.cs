using Microsoft.OpenApi.Models;
using ApiCorralon.Data;
using ApiCorralon.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.AspNetCore.Diagnostics;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    EnvironmentName = Environments.Development // Forzar Development
});
Console.WriteLine($"Entorno actual: {builder.Environment.EnvironmentName}");
// Add services to the container.
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ProductoService>();
builder.Services.AddScoped<CategoriaService>();
builder.Services.AddScoped<VentaService>();
builder.Services.AddScoped<ReporteService>();
builder.Services.AddScoped<ClienteService>();
builder.Services.AddHttpContextAccessor();

// Configuración de logging
builder.Services.AddLogging(logging =>
{
    logging.AddConsole();
    logging.AddDebug();
});

// Configuración de JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"])),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,

            // Asegurar estos mapeos
            NameClaimType = ClaimTypes.NameIdentifier,
            RoleClaimType = ClaimTypes.Role
        };
    });

// Configuración de DbContext con Npgsql
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"), npgsqlOptions =>
    {
        npgsqlOptions.CommandTimeout(60); // Tiempo de espera de 60 segundos
    }));

// Configuración de Swagger
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "ApiCorralon", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Configuración de CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
               "https://corralon-frontend.onrender.com",
               "http://localhost:5500", // Para Live Server
               "http://127.0.0.1:5500" // Alternativa para Live Server
           )
           .AllowAnyHeader()
           .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();

//// Configure the HTTP request pipeline.
//if (app.Environment.IsDevelopment())
//{
//    app.UseSwagger();
//    app.UseSwaggerUI();
//    Console.WriteLine("Swagger configurado en Development");
//}
//else
//{
//    app.UseSwagger();
//    app.UseSwaggerUI(options =>
//    {
//        options.SwaggerEndpoint("/swagger/v1/swagger.json", "ApiCorralon v1");
//        options.RoutePrefix = "swagger";
//        options.DocumentTitle = "ApiCorralon API";
//    });
//    Console.WriteLine("Swagger configurado en Production");
//}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "ApiCorralon v1");
    c.RoutePrefix = "swagger"; // Asegura que la URL sea /swagger
});
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.ContentType = "application/json";
        var exception = context.Features.Get<IExceptionHandlerFeature>()?.Error;
        if (exception != null)
        {
            context.Response.StatusCode = exception switch
            {
                ArgumentException => 400,
                KeyNotFoundException => 404,
                _ => 500
            };

            var errorResponse = new
            {
                Message = exception.Message,
                StackTrace = app.Environment.IsDevelopment() ? exception.StackTrace : null
            };

            await context.Response.WriteAsJsonAsync(errorResponse);
        }
    });
});

app.Run();

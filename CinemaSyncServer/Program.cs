using System.Diagnostics;
using System.Net.Sockets;
using Microsoft.AspNetCore.Diagnostics;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHttpClient();
builder.Services.AddSingleton<CinemaSyncServer.Services.MapiService>();
builder.Services.AddSingleton<CinemaSyncServer.Services.PythonPredictorClient>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    StartMlServiceIfNeeded(app);
}

app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        Exception? ex = context.Features.Get<IExceptionHandlerFeature>()?.Error;

        Console.WriteLine("===== UNHANDLED EXCEPTION =====");
        Console.WriteLine(ex);
        Console.WriteLine("================================");

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";

        string detail = app.Environment.IsDevelopment() && ex != null
            ? ex.Message
            : "אירעה שגיאה בשרת, נסה שוב מאוחר יותר.";

        await context.Response.WriteAsJsonAsync(new { title = "שגיאת שרת", detail });
    });
});

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();

static void StartMlServiceIfNeeded(WebApplication app)
{
    if (IsPortInUse(8000))
    {
        return;
    }

    try
    {
        string mlServicePath = Path.Combine(app.Environment.ContentRootPath, "..", "MLService");

        var startInfo = new ProcessStartInfo
        {
            FileName = "py",
            Arguments = "-m uvicorn main:app --port 8000",
            WorkingDirectory = mlServicePath,
            UseShellExecute = true,
            WindowStyle = ProcessWindowStyle.Normal
        };

        Process.Start(startInfo);
    }
    catch (Exception ex)
    {
        Console.WriteLine("Could not auto-start MLService, start it manually: " + ex.Message);
    }
}

static bool IsPortInUse(int port)
{
    try
    {
        using var client = new TcpClient();
        IAsyncResult result = client.BeginConnect("127.0.0.1", port, null, null);
        bool connected = result.AsyncWaitHandle.WaitOne(TimeSpan.FromMilliseconds(300));
        if (connected)
        {
            client.EndConnect(result);
        }
        return connected;
    }
    catch
    {
        return false;
    }
}
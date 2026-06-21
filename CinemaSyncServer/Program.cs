using System.Diagnostics;
using System.Net.Sockets;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddHttpClient();
builder.Services.AddSingleton<CinemaSyncServer.Services.MapiService>();
builder.Services.AddSingleton<CinemaSyncServer.Services.PythonPredictorClient>();

// Auto-start the Python ML prediction service (port 8000) if it isn't already running
StartPythonMlServiceIfNeeded(builder.Environment.ContentRootPath);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());

app.UseAuthorization();

app.MapControllers();

app.Run();

static void StartPythonMlServiceIfNeeded(string contentRootPath)
{
    try
    {
        using (var test = new TcpClient())
        {
            var connectTask = test.ConnectAsync("127.0.0.1", 8000);
            if (connectTask.Wait(300) && test.Connected)
                return; // already running - do not launch a second instance
        }
    }
    catch { /* not running - we will start it below */ }

    try
    {
        var mlDir = Path.GetFullPath(Path.Combine(contentRootPath, "..", "MLService"));
        var psi = new ProcessStartInfo
        {
            FileName = "py",
            Arguments = "-m uvicorn main:app --host 127.0.0.1 --port 8000",
            WorkingDirectory = mlDir,
            UseShellExecute = true,
        };
        Process.Start(psi);
        Console.WriteLine("Starting Python ML service on http://127.0.0.1:8000 (loading the model takes ~60s)...");
    }
    catch (Exception ex)
    {
        Console.WriteLine("Could not auto-start Python ML service: " + ex.Message);
    }
}
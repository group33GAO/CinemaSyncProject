# CinemaSync

CinemaSync is a cinema operations management system: inventory counting, movie scheduling (manual and AI-assisted), branch/venue scheduling, and manpower optimization, backed by a machine-learning service that predicts ticket sales, occupancy, and recommended time slots for future screenings.

## Project Structure

```
CinemaSyncProject/
├── CinemaSyncServer/     ASP.NET Core Web API (C#) - Controllers, Models, DAL
├── CinemaSyncClient/     Static frontend - HTML, CSS, JS (jQuery, Bootstrap, SweetAlert)
├── MLService/            Python FastAPI microservice - ticket/occupancy predictions
└── SQL/                  Tables.sql and Procedures.sql (run manually in SSMS)
```

## Prerequisites

- .NET 6 SDK
- SQL Server access (connection details are in `CinemaSyncServer/appsettings.json`, not covered here)
- Python 3.12+ with `pip`
- Visual Studio (with IIS Express) or any static file server, to serve the client pages

## Setup

### 1. Database

Run `SQL/Tables.sql` and then `SQL/Procedures.sql` in SQL Server Management Studio (SSMS), in that order, against the configured database.

### 2. ML Service (Python)

**Important:** the trained model file `cinema_model.pkl` (~2.4 GB) is **not included** in this repository - GitHub does not allow files that large. It is excluded via `.gitignore`.

1. Download the model file from: `https://drive.google.com/drive/folders/1k6yYBAVYQx3pucQwQND62tSxIdWD7CLz?usp=sharing`
2. Place the downloaded file at `MLService` (same folder as `main.py`).
3. Install dependencies:
   ```
   cd MLService
   pip install -r requirements.txt
   ```
4. Start the service:
   ```
   py -m uvicorn main:app --port 8000
   ```

**The ML service must be running before the C# server is started.** If it isn't, scheduling predictions will fail with a "connection refused" error on `127.0.0.1:8000`. (In Development mode, the C# server will try to auto-start it if port 8000 is free, but dependencies and the model file must already be in place for that to succeed.)

### 3. Server (C#)

Open the solution in Visual Studio and run the `CinemaSyncServer` project (or `dotnet run` from that folder). It listens on `https://localhost:7216`.

### 4. Client

Serve the `CinemaSyncClient` folder with IIS Express (via Visual Studio) or any static file server, and open `Pages/Login.html`. The API base URL is configured in `CinemaSyncClient/JS/JavaScript.js` (`API_BASE`).

## Notes

- The demo credentials shown on the Login page are placeholders; create the actual demo user via the Register page or a direct SQL insert.
- Build artifacts (`bin/`, `obj/`), Python virtual environments, and the `.pkl` model file are excluded from version control via `.gitignore`.

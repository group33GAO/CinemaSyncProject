# InvestiQo Project Rules

## Architecture
- Server side: Models → DAL (DBservices.cs) → Controllers
- Client side: Pages (HTML), CSS folder, JS folder
- Server port: 5009 (fixed in launchSettings.json)
- Client runs on IIS Express (Visual Studio)
- API_BASE = "http://localhost:7216/api" defined in JS/JavaScript.js

## Technologies
- Backend: C# ASP.NET Core Web API
- Database: SQL Server at Media.ruppin.ac.il, SQL Server Authentication
- No ORM - raw SQL only with System.Data.SqlClient
- Frontend: HTML, CSS, JavaScript, jQuery, AJAX, Bootstrap, SweetAlert
- NO React, NO TypeScript, NO modern frameworks

## Coding Rules - MUST FOLLOW
- Use var, NOT const or let
- Use named functions, NOT arrow functions
- Use $(document).ready() for jQuery
- NO async/await
- NO arrow functions (=>)
- NO debounce or unfamiliar patterns
- All AJAX calls must use the central ajaxCall function in JS/JavaScript.js

## AJAX
- Central function: ajaxCall(method, api, data, successCB, errorCB)
- Always build URLs as: API_BASE + "/endpoint"
- If no data to send, pass null as the data parameter

## SQL
- All new tables go in SQL/Tables.sql (append only)
- All new stored procedures go in SQL/Procedures.sql (append only)
- Never auto-run SQL - the student runs it manually in SSMS

## Folder Structure
- Server project: contains Models, DAL, Controllers
- Client project: invetiqoClient folder with CSS, JS, Pages subfolders
- SQL folder: Tables.sql and Procedures.sql

## Security
- appsettings.json contains sensitive credentials (API keys, connection strings)
- Never read, print, or expose the contents of appsettings.json in any response or output

## Notifications to Student
- After every change, explicitly tell the student if she needs 
  to run anything manually in SSMS (SQL Server Management Studio)
- If new SQL was added to Tables.sql or Procedures.sql, 
  say exactly: "יש להריץ את הקוד החדש ב-SSMS"
- Never assume SQL was already executed

## Server Architecture - 3 Layer Rules (STRICT)

### Controller Layer
- The controller is a MEDIATOR ONLY.
- It receives the HTTP request, calls a Model (BL) method, and returns the result.
- It does NOT perform calculations, validation, conditions, or business decisions.
- Correct pattern:
    [HttpPost]
    public bool Post([FromBody] Game game)
    {
        return Game.Insert(game);
    }

### Model (BL) Layer - folder: Models/
- All business logic lives here: validation, conditions, calculations, decisions.
- The Model instantiates DBservices and calls DAL methods.
- The Model decides what to do with the result (e.g. throw exception if nothing was inserted).
- Correct pattern:
    public static bool Insert(Game game)
    {
        DBservices db = new DBservices();
        int numEffected = db.InsertGame(game);
        if (numEffected == 0)
            throw new Exception("Game was not inserted");
        return true;
    }

### DAL Layer - file: DAL/DBservices.cs
- Only raw SQL / stored procedure calls. No business logic.
- May contain IF conditions only for resource management (e.g. checking if connection is null before closing).
- Every method follows this pattern:
    1. Declare SqlConnection con and SqlCommand cmd
    2. try { con = connect("myProjDB"); } catch(Exception ex) { throw(ex); }
    3. Build paramDic Dictionary<string, object>
    4. cmd = CreateCommandWithStoredProcedureGeneral(spName, con, paramDic)
    5. try { execute and return result } catch(Exception ex) { throw(ex); } finally { if(con != null) con.Close(); }

## Exception Handling Rules

### The Pattern (per course examples)
- Use try-catch in DAL methods, with finally for closing the connection.
- The preferred pattern uses finally to close the connection (guarantees it closes whether or not there was an error):
    try { ... execute ... return result; }
    catch (Exception ex) { throw (ex); }
    finally { if (con != null) { con.Close(); } }

### Exception Flow (bubbling)
- DAL throws → Model catches or lets it bubble up → Controller lets it bubble up to the framework.
- Never catch an exception just to ignore it. If you catch, you must re-throw it: throw(ex)
- The catch block should always contain: // write to log + throw(ex)

### NEVER do this:
- NEVER swallow an exception silently (empty catch block)
- NEVER put business logic conditions (price checks, count checks, data validation) inside DBservices.cs
- NEVER put try-catch in the Controller- Every DAL method must have a short comment above it describing what it does.
- Example:
    //--------------------------------------------------------------------------------------------------
    // This method inserts a new startup into the Startups table
    //--------------------------------------------------------------------------------------------------
    public int InsertStartup(Startup startup) { ... }
- Do NOT add comments anywhere else in the code (not in Controllers, not in Models, not in JS).

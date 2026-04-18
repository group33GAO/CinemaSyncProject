-- =========================================================
-- CinemaSync - Stored Procedures (append only)
-- =========================================================

-- =========================================================
-- Branches
-- =========================================================

CREATE OR ALTER PROCEDURE SP_Branches_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT BranchCode, BranchName, City, MapiSiteId
    FROM Branches
    ORDER BY BranchCode;
END;
GO

CREATE OR ALTER PROCEDURE SP_Branches_GetById
    @BranchCode INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT BranchCode, BranchName, City, MapiSiteId
    FROM Branches
    WHERE BranchCode = @BranchCode;
END;
GO

CREATE OR ALTER PROCEDURE SP_Branches_Insert
    @BranchCode  INT,
    @BranchName  NVARCHAR(100),
    @City        NVARCHAR(100),
    @MapiSiteId  INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Branches (BranchCode, BranchName, City, MapiSiteId)
    VALUES (@BranchCode, @BranchName, @City, @MapiSiteId);

    SELECT @@ROWCOUNT AS RowsAffected;
END;
GO

CREATE OR ALTER PROCEDURE SP_Branches_Update
    @BranchCode  INT,
    @BranchName  NVARCHAR(100),
    @City        NVARCHAR(100),
    @MapiSiteId  INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Branches
    SET BranchName = @BranchName,
        City       = @City,
        MapiSiteId = @MapiSiteId
    WHERE BranchCode = @BranchCode;

    SELECT @@ROWCOUNT AS RowsAffected;
END;
GO

CREATE OR ALTER PROCEDURE SP_Branches_Delete
    @BranchCode INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Branches
    WHERE BranchCode = @BranchCode;

    SELECT @@ROWCOUNT AS RowsAffected;
END;
GO

-- =========================================================
-- Users
-- =========================================================

CREATE OR ALTER PROCEDURE SP_Users_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserId, Email, FullName, Role, BranchCode, LastLogin
    FROM Users
    ORDER BY UserId;
END;
GO

CREATE OR ALTER PROCEDURE SP_Users_GetById
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserId, Email, FullName, Role, BranchCode, LastLogin
    FROM Users
    WHERE UserId = @UserId;
END;
GO

CREATE OR ALTER PROCEDURE SP_Users_GetByEmail
    @Email NVARCHAR(150)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT UserId, Email, FullName, Role, BranchCode, LastLogin
    FROM Users
    WHERE Email = @Email;
END;
GO

CREATE OR ALTER PROCEDURE SP_Users_Insert
    @Email        NVARCHAR(150),
    @PasswordHash NVARCHAR(256),
    @FullName     NVARCHAR(150),
    @Role         NVARCHAR(30),
    @BranchCode   INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Users (Email, PasswordHash, FullName, Role, BranchCode)
    VALUES (@Email, @PasswordHash, @FullName, @Role, @BranchCode);

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS NewUserId;
END;
GO

CREATE OR ALTER PROCEDURE SP_Users_Login
    @Email        NVARCHAR(150),
    @PasswordHash NVARCHAR(256)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM Users WHERE Email = @Email AND PasswordHash = @PasswordHash)
    BEGIN
        UPDATE Users
        SET LastLogin = SYSDATETIME()
        WHERE Email = @Email AND PasswordHash = @PasswordHash;

        SELECT UserId, Email, FullName, Role, BranchCode, LastLogin
        FROM Users
        WHERE Email = @Email AND PasswordHash = @PasswordHash;
    END
END;
GO

CREATE OR ALTER PROCEDURE SP_Users_Update
    @UserId     INT,
    @FullName   NVARCHAR(150),
    @Role       NVARCHAR(30),
    @BranchCode INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Users
    SET FullName   = @FullName,
        Role       = @Role,
        BranchCode = @BranchCode
    WHERE UserId = @UserId;

    SELECT @@ROWCOUNT AS RowsAffected;
END;
GO

CREATE OR ALTER PROCEDURE SP_Users_Delete
    @UserId INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM Users
    WHERE UserId = @UserId;

    SELECT @@ROWCOUNT AS RowsAffected;
END;
GO

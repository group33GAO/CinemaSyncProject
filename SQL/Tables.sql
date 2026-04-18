-- =========================================================
-- CinemaSync - Tables (append only)
-- =========================================================

-- ---------------------------------------------------------
-- Branches
-- ---------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Branches')
BEGIN
    CREATE TABLE Branches
    (
        BranchCode   INT          NOT NULL PRIMARY KEY,
        BranchName   NVARCHAR(100) NOT NULL,
        City         NVARCHAR(100) NOT NULL,
        MapiSiteId   INT          NULL
    );
END;
GO

-- ---------------------------------------------------------
-- Users
-- ---------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users
    (
        UserId       INT           IDENTITY(1,1) NOT NULL PRIMARY KEY,
        Email        NVARCHAR(150) NOT NULL UNIQUE,
        PasswordHash NVARCHAR(256) NOT NULL,
        FullName     NVARCHAR(150) NOT NULL,
        Role         NVARCHAR(30)  NOT NULL,
        BranchCode   INT           NULL,
        LastLogin    DATETIME2     NULL,
        CONSTRAINT FK_Users_Branches FOREIGN KEY (BranchCode)
            REFERENCES Branches(BranchCode)
    );
END;
GO

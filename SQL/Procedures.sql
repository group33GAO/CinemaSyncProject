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

-- =========================================================
-- Products
-- =========================================================

CREATE OR ALTER PROCEDURE SP_Products_GetAll
AS
BEGIN
    SET NOCOUNT ON;
    SELECT ProductId, Barcode, ProductName, UnitsPerPackage, Supplier,
           SupplierMinOrder, DefaultRequiredStock, Notes, IsActive
    FROM Products
    WHERE IsActive = 1
    ORDER BY
        CASE WHEN Supplier = N'החברה המרכזית' THEN 0 ELSE 1 END,
        Supplier,
        ProductName;
END;
GO

-- =========================================================
-- Branch Inventory
-- =========================================================

CREATE OR ALTER PROCEDURE SP_BranchInventory_GetByBranch
    @BranchCode INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        p.ProductId,
        p.Barcode,
        p.ProductName,
        p.UnitsPerPackage,
        p.Supplier,
        p.SupplierMinOrder,
        p.Notes,
        ISNULL(bi.CurrentStock, 0)                                      AS CurrentStock,
        ISNULL(bi.RequiredStock, p.DefaultRequiredStock)                AS RequiredStock,
        bi.LastUpdated
    FROM Products p
    LEFT JOIN BranchInventory bi
        ON bi.ProductId = p.ProductId AND bi.BranchCode = @BranchCode
    WHERE p.IsActive = 1
    ORDER BY
        CASE WHEN p.Supplier = N'החברה המרכזית' THEN 0 ELSE 1 END,
        p.Supplier,
        p.ProductName;
END;
GO

CREATE OR ALTER PROCEDURE SP_BranchInventory_UpdateStock
    @BranchCode   INT,
    @ProductId    INT,
    @CurrentStock INT
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM BranchInventory WHERE BranchCode = @BranchCode AND ProductId = @ProductId)
    BEGIN
        UPDATE BranchInventory
        SET CurrentStock = @CurrentStock,
            LastUpdated  = SYSDATETIME()
        WHERE BranchCode = @BranchCode AND ProductId = @ProductId;
    END
    ELSE
    BEGIN
        INSERT INTO BranchInventory (BranchCode, ProductId, CurrentStock, LastUpdated)
        VALUES (@BranchCode, @ProductId, @CurrentStock, SYSDATETIME());
    END

    SELECT @@ROWCOUNT AS RowsAffected;
END;
GO

CREATE OR ALTER PROCEDURE SP_BranchInventory_SeedForBranch
    @BranchCode INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO BranchInventory (BranchCode, ProductId, CurrentStock)
    SELECT @BranchCode, p.ProductId, 0
    FROM Products p
    WHERE p.IsActive = 1
      AND NOT EXISTS (
          SELECT 1 FROM BranchInventory bi
          WHERE bi.BranchCode = @BranchCode AND bi.ProductId = p.ProductId
      );

    SELECT @@ROWCOUNT AS RowsAffected;
END;
GO

-- =========================================================
-- Venues
-- =========================================================

CREATE OR ALTER PROCEDURE SP_Venues_GetById
    @VenueId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT VenueId, BranchCode, VenueName, Capacity, VenueType, Has3D, HasAtmos, IsActive
    FROM Venues
    WHERE VenueId = @VenueId;
END;
GO

-- =========================================================
-- Inventory Counts
-- =========================================================

CREATE OR ALTER PROCEDURE SP_InventoryCounts_GetByBranch
    @BranchCode INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CountId, BranchCode, CountName, CreatedAt, IsPrimary
    FROM InventoryCounts
    WHERE BranchCode = @BranchCode
    ORDER BY CreatedAt DESC;
END;
GO

CREATE OR ALTER PROCEDURE SP_InventoryCounts_Create
    @BranchCode INT,
    @CountName  NVARCHAR(200),
    @IsPrimary  BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF @IsPrimary = 1
    BEGIN
        UPDATE InventoryCounts
        SET IsPrimary = 0
        WHERE BranchCode = @BranchCode;
    END

    INSERT INTO InventoryCounts (BranchCode, CountName, IsPrimary)
    VALUES (@BranchCode, @CountName, @IsPrimary);

    SELECT CAST(SCOPE_IDENTITY() AS INT) AS CountId;
END;
GO

CREATE OR ALTER PROCEDURE SP_InventoryCounts_SetPrimary
    @CountId    INT,
    @BranchCode INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE InventoryCounts
    SET IsPrimary = 0
    WHERE BranchCode = @BranchCode;

    UPDATE InventoryCounts
    SET IsPrimary = 1
    WHERE CountId = @CountId AND BranchCode = @BranchCode;

    SELECT @@ROWCOUNT AS RowsAffected;
END;
GO

CREATE OR ALTER PROCEDURE SP_InventoryCountItems_Insert
    @CountId      INT,
    @ProductId    INT,
    @StockAtCount INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO InventoryCountItems (CountId, ProductId, StockAtCount)
    VALUES (@CountId, @ProductId, @StockAtCount);

    SELECT @@ROWCOUNT AS RowsAffected;
END;
GO

CREATE OR ALTER PROCEDURE SP_InventoryCountItems_GetByCount
    @CountId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        ci.CountId,
        ci.ProductId,
        ci.StockAtCount,
        p.ProductName,
        p.Supplier,
        p.Barcode,
        p.Notes,
        p.UnitsPerPackage,
        p.SupplierMinOrder,
        ISNULL(bi.RequiredStock, p.DefaultRequiredStock) AS RequiredStock
    FROM InventoryCountItems ci
    INNER JOIN Products p ON p.ProductId = ci.ProductId
    LEFT JOIN BranchInventory bi
        ON bi.ProductId = ci.ProductId
        AND bi.BranchCode = (SELECT BranchCode FROM InventoryCounts WHERE CountId = @CountId)
    WHERE ci.CountId = @CountId
    ORDER BY
        CASE WHEN p.Supplier = N'החברה המרכזית' THEN 0 ELSE 1 END,
        p.Supplier,
        p.ProductName;
END;
GO

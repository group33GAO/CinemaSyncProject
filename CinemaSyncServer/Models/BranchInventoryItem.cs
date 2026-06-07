using CinemaSyncServer.DAL;
using System;
using System.Collections.Generic;

namespace CinemaSyncServer.Models
{
    public class BranchInventoryItem
    {
        public int BranchCode { get; set; }
        public int ProductId { get; set; }
        public string? Barcode { get; set; }
        public string? ProductName { get; set; }
        public int UnitsPerPackage { get; set; }
        public string? Supplier { get; set; }
        public string? SupplierMinOrder { get; set; }
        public string? Notes { get; set; }
        public int CurrentStock { get; set; }
        public int? RequiredStock { get; set; }
        public DateTime? LastUpdated { get; set; }

        public BranchInventoryItem() { }

        public static bool UpdateStock(BranchInventoryItem item)
        {
            if (item == null)
                throw new Exception("Inventory item is missing");

            return UpdateStock(item.BranchCode, item.ProductId, item.CurrentStock);
        }

        public static List<BranchInventoryItem> GetByBranch(int branchCode)
        {
            if (branchCode <= 0)
                throw new Exception("Invalid branch code");

            DBservices db = new DBservices();
            return db.GetBranchInventory(branchCode);
        }

        public static bool UpdateStock(int branchCode, int productId, int currentStock)
        {
            if (branchCode <= 0)
                throw new Exception("Invalid branch code");

            if (productId <= 0)
                throw new Exception("Invalid product id");

            if (currentStock < 0)
                throw new Exception("Stock cannot be negative");

            DBservices db = new DBservices();
            int numEffected = db.UpdateBranchInventoryStock(branchCode, productId, currentStock);

            if (numEffected == 0)
                throw new Exception("Inventory stock was not updated");

            return true;
        }

        public static bool SeedForBranch(int branchCode)
        {
            if (branchCode <= 0)
                throw new Exception("Invalid branch code");

            DBservices db = new DBservices();
            db.SeedBranchInventory(branchCode);
            return true;
        }
    }
}

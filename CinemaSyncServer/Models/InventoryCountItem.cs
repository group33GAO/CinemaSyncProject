using CinemaSyncServer.DAL;
using System;
using System.Collections.Generic;

namespace CinemaSyncServer.Models
{
    public class InventoryCountItem
    {
        public int CountId { get; set; }
        public int ProductId { get; set; }
        public int StockAtCount { get; set; }
        public string? ProductName { get; set; }
        public string? Supplier { get; set; }
        public string? Barcode { get; set; }
        public string? Notes { get; set; }
        public int UnitsPerPackage { get; set; }
        public string? SupplierMinOrder { get; set; }
        public int? RequiredStock { get; set; }

        public InventoryCountItem() { }

        public static List<InventoryCountItem> GetByCount(int countId)
        {
            if (countId <= 0)
                throw new Exception("Invalid count id");

            DBservices db = new DBservices();
            return db.GetInventoryCountItems(countId);
        }
    }
}

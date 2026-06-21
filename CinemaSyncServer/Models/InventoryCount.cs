using CinemaSyncServer.DAL;
using System;
using System.Collections.Generic;

namespace CinemaSyncServer.Models
{
    public class InventoryCount
    {
        public int CountId { get; set; }
        public int BranchCode { get; set; }
        public string? CountName { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsPrimary { get; set; }
        public List<InventoryCountItem>? Items { get; set; }

        public InventoryCount() { }

        public static List<InventoryCount> GetByBranch(int branchCode)
        {
            if (branchCode <= 0)
                throw new Exception("Invalid branch code");

            DBservices db = new DBservices();
            return db.GetInventoryCountsByBranch(branchCode);
        }

        public static int Create(InventoryCount count)
        {
            if (count == null || string.IsNullOrWhiteSpace(count.CountName))
                throw new Exception("Count name is required");

            if (count.BranchCode <= 0)
                throw new Exception("Invalid branch code");

            DBservices db = new DBservices();
            int countId = db.CreateInventoryCount(count.BranchCode, count.CountName, count.IsPrimary);

            if (count.Items != null)
            {
                foreach (var item in count.Items)
                {
                    db.InsertInventoryCountItem(countId, item.ProductId, item.StockAtCount);
                    db.UpdateBranchInventoryStock(count.BranchCode, item.ProductId, item.StockAtCount);
                }
            }

            return countId;
        }

        public static bool SetPrimary(int countId, int branchCode)
        {
            if (countId <= 0)
                throw new Exception("Invalid count id");

            if (branchCode <= 0)
                throw new Exception("Invalid branch code");

            DBservices db = new DBservices();
            int numEffected = db.SetInventoryCountPrimary(countId, branchCode);

            if (numEffected == 0)
                throw new Exception("Count was not found");

            return true;
        }
    }
}

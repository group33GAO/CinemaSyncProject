using CinemaSyncServer.DAL;
using System.Collections.Generic;

namespace CinemaSyncServer.Models
{
    public class Product
    {
        public int ProductId { get; set; }
        public string? Barcode { get; set; }
        public string? ProductName { get; set; }
        public int UnitsPerPackage { get; set; }
        public string? Supplier { get; set; }
        public string? SupplierMinOrder { get; set; }
        public int? DefaultRequiredStock { get; set; }
        public string? Notes { get; set; }
        public bool IsActive { get; set; }

        public Product() { }

        public static List<Product> GetAll()
        {
            DBservices db = new DBservices();
            return db.GetAllProducts();
        }
    }
}

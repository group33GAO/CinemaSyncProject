using CinemaSyncServer.Models;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;

namespace CinemaSyncServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InventoryController : ControllerBase
    {
        [HttpGet("products")]
        public List<Product> GetAllProducts()
        {
            return Product.GetAll();
        }

        [HttpGet("{branchCode}")]
        public List<BranchInventoryItem> GetByBranch(int branchCode)
        {
            return BranchInventoryItem.GetByBranch(branchCode);
        }

        [HttpPut]
        public bool UpdateStock([FromBody] BranchInventoryItem item)
        {
            return BranchInventoryItem.UpdateStock(item);
        }

        [HttpPost("seed/{branchCode}")]
        public bool SeedForBranch(int branchCode)
        {
            return BranchInventoryItem.SeedForBranch(branchCode);
        }
    }
}

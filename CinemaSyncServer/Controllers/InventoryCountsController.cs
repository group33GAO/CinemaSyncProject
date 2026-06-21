using CinemaSyncServer.Models;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;

namespace CinemaSyncServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class InventoryCountsController : ControllerBase
    {
        [HttpGet("{branchCode}")]
        public List<InventoryCount> GetByBranch(int branchCode)
        {
            return InventoryCount.GetByBranch(branchCode);
        }

        [HttpPost]
        public int Create([FromBody] InventoryCount count)
        {
            return InventoryCount.Create(count);
        }

        [HttpPut("{countId}/primary")]
        public bool SetPrimary(int countId, [FromQuery] int branchCode)
        {
            return InventoryCount.SetPrimary(countId, branchCode);
        }

        [HttpGet("{countId}/items")]
        public List<InventoryCountItem> GetItems(int countId)
        {
            return InventoryCountItem.GetByCount(countId);
        }
    }
}

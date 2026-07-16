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
        public bool SetPrimary(int countId, [FromQuery] int branchCode, [FromQuery] bool isPrimary)
        {
            return InventoryCount.SetPrimary(countId, branchCode, isPrimary);
        }

        [HttpGet("{countId}/items")]
        public List<InventoryCountItem> GetItems(int countId)
        {
            return InventoryCountItem.GetByCount(countId);
        }

        [HttpPut("{countId}/items")]
        public bool UpdateItems(int countId, [FromBody] InventoryCount count)
        {
            return InventoryCount.UpdateItems(countId, count);
        }

        [HttpDelete("{countId}")]
        public bool Delete(int countId)
        {
            return InventoryCount.Delete(countId);
        }
    }
}

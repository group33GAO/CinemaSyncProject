using CinemaSyncServer.Models;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;

namespace CinemaSyncServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class VenuesController : ControllerBase
    {
        [HttpGet("by-branch/{branchCode}")]
        public List<Venue> GetByBranch(int branchCode)
        {
            return Venue.GetByBranch(branchCode);
        }
    }
}

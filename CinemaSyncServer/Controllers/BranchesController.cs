using CinemaSyncServer.Models;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;

namespace CinemaSyncServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BranchesController : ControllerBase
    {
        [HttpGet]
        public List<Branch> Get()
        {
            return Branch.GetAll();
        }

        [HttpGet("{branchCode}")]
        public Branch Get(int branchCode)
        {
            return Branch.GetById(branchCode);
        }

        [HttpPost]
        public bool Post([FromBody] Branch branch)
        {
            return Branch.Insert(branch);
        }

        [HttpPut]
        public bool Put([FromBody] Branch branch)
        {
            return Branch.Update(branch);
        }

        [HttpDelete("{branchCode}")]
        public bool Delete(int branchCode)
        {
            return Branch.Delete(branchCode);
        }
    }
}

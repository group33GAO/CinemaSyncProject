using CinemaSyncServer.Models;
using CinemaSyncServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace CinemaSyncServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SchedulingController : ControllerBase
    {
        private readonly MapiService mapiService;
        private readonly PythonPredictorClient predictor;

        public SchedulingController(MapiService mapiService, PythonPredictorClient predictor)
        {
            this.mapiService = mapiService;
            this.predictor = predictor;
        }

        [HttpPost("rank-and-schedule")]
        public BranchScheduleResult RankAndSchedule([FromBody] BranchScheduleRequest request)
        {
            return BranchScheduler.Schedule(request, mapiService, predictor);
        }

        [HttpGet("health")]
        public object Health()
        {
            return new { ready = predictor.IsReady() };
        }
    }
}

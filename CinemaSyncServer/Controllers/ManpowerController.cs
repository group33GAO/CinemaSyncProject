using CinemaSyncServer.Models;
using CinemaSyncServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace CinemaSyncServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ManpowerController : ControllerBase
    {
        private readonly MapiService mapiService;
        private readonly PythonPredictorClient predictor;

        public ManpowerController(MapiService mapiService, PythonPredictorClient predictor)
        {
            this.mapiService = mapiService;
            this.predictor = predictor;
        }

        [HttpPost("calculate")]
        public ManpowerResult Calculate([FromBody] ManpowerRequest request)
        {
            return ManpowerOptimizer.Calculate(request);
        }

        [HttpPost("day-guests")]
        public ManpowerDayGuestsResult DayGuests([FromBody] ManpowerDayGuestsRequest request)
        {
            return ManpowerOptimizer.GetDayGuests(request, mapiService, predictor);
        }

        [HttpPost("calculate-week")]
        public ManpowerWeekResult CalculateWeek([FromBody] ManpowerWeekRequest request)
        {
            return ManpowerOptimizer.CalculateForWeek(request, mapiService, predictor);
        }
    }
}

using CinemaSyncServer.Models;
using CinemaSyncServer.Services;
using Microsoft.AspNetCore.Mvc;

namespace CinemaSyncServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PredictionController : ControllerBase
    {
        private readonly MapiService mapiService;
        private readonly PythonPredictorClient predictor;

        public PredictionController(MapiService mapiService, PythonPredictorClient predictor)
        {
            this.mapiService = mapiService;
            this.predictor = predictor;
        }

        [HttpPost("predict-slot")]
        public PredictionResult PredictSlot([FromBody] PredictionRequest request)
        {
            return SlotPrediction.Predict(request, mapiService, predictor);
        }

        [HttpPost("predict-week")]
        public WeeklyPredictionResult PredictWeek([FromBody] WeeklyPredictionRequest request)
        {
            return WeeklyPrediction.Predict(request, mapiService, predictor);
        }
    }
}

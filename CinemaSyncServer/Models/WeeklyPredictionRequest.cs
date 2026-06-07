using System;

namespace CinemaSyncServer.Models
{
    public class WeeklyPredictionRequest
    {
        public string MovieEdi { get; set; }
        public int VenueId { get; set; }
        public DateTime WeekStartDate { get; set; }
    }
}

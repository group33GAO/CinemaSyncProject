using System;

namespace CinemaSyncServer.Models
{
    public class PredictionRequest
    {
        public string MovieEdi { get; set; }
        public int VenueId { get; set; }
        public DateTime SlotDateTime { get; set; }
    }
}

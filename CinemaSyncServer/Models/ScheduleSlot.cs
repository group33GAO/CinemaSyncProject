namespace CinemaSyncServer.Models
{
    public class ScheduleSlot
    {
        public int VenueId { get; set; }
        public string VenueName { get; set; }
        public string MovieEdi { get; set; }
        public string MovieTitle { get; set; }
        public int DayIndex { get; set; }
        public string DateIso { get; set; }
        public int Hour { get; set; }
        public int PredictedTickets { get; set; }
        public double Occupancy { get; set; }
    }
}

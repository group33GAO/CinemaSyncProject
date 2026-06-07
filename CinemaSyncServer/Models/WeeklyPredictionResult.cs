using System.Collections.Generic;

namespace CinemaSyncServer.Models
{
    public class WeeklyPredictionResult
    {
        public string MovieTitle { get; set; }
        public int Capacity { get; set; }
        public int MinTickets { get; set; }
        public int MaxTickets { get; set; }
        public List<WeeklyPredictionCell> Cells { get; set; } = new List<WeeklyPredictionCell>();
    }

    public class WeeklyPredictionCell
    {
        public int DayIndex { get; set; }
        public string DateIso { get; set; }
        public int Hour { get; set; }
        public int Tickets { get; set; }
        public double Occupancy { get; set; }
    }
}

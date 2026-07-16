using System.Collections.Generic;

namespace CinemaSyncServer.Models
{
    public class ManpowerDay
    {
        public int DayIndex { get; set; }
        public string DateIso { get; set; }
        public int TotalGuests { get; set; }
        public int Screenings { get; set; }
        public int AvgPerScreening { get; set; }
        public int TierGuests { get; set; }
        public int ServiceHost { get; set; }
        public int ViewingExperience { get; set; }
        public int SalesReps { get; set; }
        public int Ushers { get; set; }
        public int TotalStaff { get; set; }
    }

    public class ManpowerWeekResult
    {
        public List<ManpowerDay> Days { get; set; } = new List<ManpowerDay>();
        public int WeekTotalGuests { get; set; }
        public int WeekTotalStaff { get; set; }
        public int VenueCount { get; set; }
        public int WeekTotalScreenings { get; set; }
    }
}

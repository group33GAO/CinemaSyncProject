namespace CinemaSyncServer.Models
{
    public class ManpowerDayGuestsResult
    {
        public string DateIso { get; set; }
        public int DailyGuests { get; set; }
        public int Screenings { get; set; }
        public int AvgPerScreening { get; set; }
    }
}

namespace CinemaSyncServer.Models
{
    public class ManpowerRequest
    {
        public int BaseGuests { get; set; }
        public string Weather { get; set; }
        public string Events { get; set; }
        public bool IsHoliday { get; set; }
        public bool IsPremiere { get; set; }
        public bool IsSchoolVacation { get; set; }
        public bool IsHostedEvent { get; set; }
    }
}

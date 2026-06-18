namespace CinemaSyncServer.Models
{
    public class RankedMovie
    {
        public int Rank { get; set; }
        public string MovieEdi { get; set; }
        public string Title { get; set; }
        public string Genre { get; set; }
        public bool Is3D { get; set; }
        public double AverageTickets { get; set; }
    }
}

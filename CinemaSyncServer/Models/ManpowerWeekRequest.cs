using System;

namespace CinemaSyncServer.Models
{
    public class ManpowerWeekRequest
    {
        public int BranchCode { get; set; }
        public DateTime WeekStartDate { get; set; }
    }
}

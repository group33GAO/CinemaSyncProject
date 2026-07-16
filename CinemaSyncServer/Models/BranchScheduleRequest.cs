using System;

namespace CinemaSyncServer.Models
{
    public class BranchScheduleRequest
    {
        public int BranchCode { get; set; }
        public DateTime WeekStartDate { get; set; }
    }
}

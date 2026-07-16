using System.Collections.Generic;

namespace CinemaSyncServer.Models
{
    public class BranchScheduleResult
    {
        public List<RankedMovie> RankedMovies { get; set; }
        public List<ScheduleSlot> Schedule { get; set; }
    }
}

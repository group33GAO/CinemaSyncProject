using System.Collections.Generic;

namespace CinemaSyncServer.Models
{
    public class PredictionResult
    {
        public double Occupancy { get; set; }
        public int Capacity { get; set; }
        public int EstimatedAttendees { get; set; }
        public double BaseTickets { get; set; }
        public List<FactorContribution> TopContributions { get; set; } = new List<FactorContribution>();
    }

    public class FactorContribution
    {
        public string Label { get; set; }
        public string Feature { get; set; }
        public double InputValue { get; set; }
        public double ShapValue { get; set; }
        public string Explanation { get; set; }
    }
}

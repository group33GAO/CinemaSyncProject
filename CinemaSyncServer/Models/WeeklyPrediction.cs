using CinemaSyncServer.Services;
using System;
using System.Collections.Generic;

namespace CinemaSyncServer.Models
{
    public class WeeklyPrediction
    {
        private static readonly int[] Hours = new int[] { 10, 12, 14, 16, 18, 20, 22, 23 };

        public static WeeklyPredictionResult Predict(WeeklyPredictionRequest req, MapiService mapiService, PythonPredictorClient predictor)
        {
            if (req == null)
                throw new Exception("Weekly prediction request is missing");
            if (string.IsNullOrWhiteSpace(req.MovieEdi))
                throw new Exception("Movie EDI is required");
            if (req.VenueId <= 0)
                throw new Exception("Invalid venue id");
            if (req.WeekStartDate == default)
                throw new Exception("Week start date is required");

            Venue venue = Venue.GetById(req.VenueId);
            Branch branch = Branch.GetById(venue.BranchCode);
            MapiMovie movie = FindMovie(mapiService, req.MovieEdi);

            DateTime weekStart = req.WeekStartDate.Date;

            List<PythonPredictionPayload> payloads = new List<PythonPredictionPayload>(56);
            List<DateTime> slotTimes = new List<DateTime>(56);

            for (int d = 0; d < 7; d++)
            {
                DateTime day = weekStart.AddDays(d);
                for (int h = 0; h < Hours.Length; h++)
                {
                    DateTime slot = new DateTime(day.Year, day.Month, day.Day, Hours[h], 0, 0);
                    PythonPredictionPayload payload = SlotPrediction.BuildPayloadForWeekly(movie, venue, branch, slot);
                    payloads.Add(payload);
                    slotTimes.Add(slot);
                }
            }

            PythonBatchResponse batch = predictor.PredictBatch(payloads);

            if (batch.Predictions.Count != payloads.Count)
                throw new Exception("Batch response count mismatch");

            int capacity = venue.Capacity > 0 ? venue.Capacity : 1;
            int minT = int.MaxValue;
            int maxT = int.MinValue;
            List<WeeklyPredictionCell> cells = new List<WeeklyPredictionCell>(payloads.Count);

            for (int i = 0; i < payloads.Count; i++)
            {
                DateTime slot = slotTimes[i];
                PythonBatchItem item = batch.Predictions[i];

                int tickets = item.PredictedTickets;
                double occ = (double)tickets / capacity;
                if (occ > 1.0) occ = 1.0;
                if (occ < 0.0) occ = 0.0;

                cells.Add(new WeeklyPredictionCell
                {
                    DayIndex = (int)(slot.Date - weekStart.Date).TotalDays,
                    DateIso = slot.ToString("yyyy-MM-dd"),
                    Hour = slot.Hour,
                    Tickets = tickets,
                    Occupancy = occ
                });

                if (tickets < minT) minT = tickets;
                if (tickets > maxT) maxT = tickets;
            }

            return new WeeklyPredictionResult
            {
                MovieTitle = movie.Title,
                Capacity = venue.Capacity,
                MinTickets = (minT == int.MaxValue) ? 0 : minT,
                MaxTickets = (maxT == int.MinValue) ? 0 : maxT,
                Cells = cells
            };
        }

        private static MapiMovie FindMovie(MapiService mapiService, string edi)
        {
            List<MapiMovie> movies = Mapi.GetMovies(mapiService);
            for (int i = 0; i < movies.Count; i++)
            {
                if (movies[i].Edi == edi)
                    return movies[i];
            }
            throw new Exception("Movie not found in MAPI feed");
        }
    }
}

using CinemaSyncServer.Services;
using System;
using System.Collections.Generic;

namespace CinemaSyncServer.Models
{
    public class GlobalMovieRanker
    {
        private static readonly int[] Hours = new int[] { 10, 12, 14, 16, 18, 20, 22, 23 };
        private const int SlotsPerWeek = 56;
        private const int GroupSize = 10;

        public static List<RankedMovie> Rank(
            List<MapiMovie> movies, Venue referenceVenue, Branch branch,
            DateTime weekStart, PythonPredictorClient predictor)
        {
            if (movies == null || movies.Count == 0)
                throw new Exception("No movies to rank");
            if (referenceVenue == null)
                throw new Exception("Reference venue is required");

            List<DateTime> slotTimes = BuildSlotTimes(weekStart);
            double[] avgTickets = new double[movies.Count];

            for (int start = 0; start < movies.Count; start += GroupSize)
            {
                int end = Math.Min(start + GroupSize, movies.Count);
                int groupCount = end - start;

                List<PythonPredictionPayload> payloads = new List<PythonPredictionPayload>(groupCount * SlotsPerWeek);
                for (int m = start; m < end; m++)
                    for (int s = 0; s < slotTimes.Count; s++)
                        payloads.Add(SlotPrediction.BuildPayloadForWeekly(movies[m], referenceVenue, branch, slotTimes[s]));

                PythonBatchResponse batch = predictor.PredictBatch(payloads);

                if (batch.Predictions.Count != payloads.Count)
                    throw new Exception("Ranking batch response count mismatch");

                int predIndex = 0;
                for (int m = start; m < end; m++)
                {
                    double total = 0;
                    for (int s = 0; s < SlotsPerWeek; s++)
                        total += batch.Predictions[predIndex++].PredictedTickets;
                    avgTickets[m] = total / SlotsPerWeek;
                }
            }

            List<RankedMovie> ranked = new List<RankedMovie>(movies.Count);
            for (int i = 0; i < movies.Count; i++)
            {
                ranked.Add(new RankedMovie
                {
                    MovieEdi = movies[i].Edi,
                    Title = movies[i].Title,
                    Genre = movies[i].Genre,
                    Is3D = movies[i].Is3D,
                    AverageTickets = avgTickets[i]
                });
            }

            ranked.Sort((a, b) => b.AverageTickets.CompareTo(a.AverageTickets));

            for (int i = 0; i < ranked.Count; i++)
                ranked[i].Rank = i + 1;

            return ranked;
        }

        private static List<DateTime> BuildSlotTimes(DateTime weekStart)
        {
            List<DateTime> slots = new List<DateTime>(SlotsPerWeek);
            for (int d = 0; d < 7; d++)
            {
                DateTime day = weekStart.AddDays(d);
                for (int h = 0; h < Hours.Length; h++)
                    slots.Add(new DateTime(day.Year, day.Month, day.Day, Hours[h], 0, 0));
            }
            return slots;
        }
    }
}

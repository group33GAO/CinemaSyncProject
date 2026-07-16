using CinemaSyncServer.Services;
using System;
using System.Collections.Generic;

namespace CinemaSyncServer.Models
{
    public class BranchScheduler
    {
        private static readonly int[] Hours = new int[] { 10, 12, 14, 16, 18, 20, 22, 23 };
        private const int SlotsPerWeek = 56;
        private const int ShortlistSize = 20;

        public static BranchScheduleResult Schedule(
            BranchScheduleRequest req, MapiService mapiService, PythonPredictorClient predictor)
        {
            if (req == null)
                throw new Exception("Schedule request is missing");
            if (req.BranchCode <= 0)
                throw new Exception("Invalid branch code");
            if (req.WeekStartDate == default)
                throw new Exception("Week start date is required");

            List<Venue> venues = Venue.GetByBranch(req.BranchCode);
            List<Venue> activeVenues = new List<Venue>();
            for (int i = 0; i < venues.Count; i++)
                if (venues[i].IsActive) activeVenues.Add(venues[i]);

            if (activeVenues.Count == 0)
                throw new Exception("No active venues found for branch " + req.BranchCode);

            activeVenues.Sort((a, b) => b.Capacity.CompareTo(a.Capacity));

            Venue referenceVenue = FindAverageVenue(activeVenues);
            Branch branch = Branch.GetById(req.BranchCode);
            List<MapiMovie> movies = Mapi.GetMovies(mapiService);

            if (movies == null || movies.Count == 0)
                throw new Exception("No movies found in MAPI feed");

            DateTime weekStart = req.WeekStartDate.Date;

            List<RankedMovie> ranked = GlobalMovieRanker.Rank(movies, referenceVenue, branch, weekStart, predictor);

            Dictionary<string, MapiMovie> movieLookup = new Dictionary<string, MapiMovie>();
            for (int i = 0; i < movies.Count; i++)
                movieLookup[movies[i].Edi] = movies[i];

            // Shared across all venues: prevents same movie at same date+hour in two halls
            HashSet<string> occupiedSlots = new HashSet<string>();
            List<ScheduleSlot> allSlots = new List<ScheduleSlot>();

            for (int v = 0; v < activeVenues.Count; v++)
            {
                List<ScheduleSlot> venueSlots = ScheduleVenue(
                    activeVenues[v], branch, ranked, movieLookup, occupiedSlots, weekStart, predictor);
                allSlots.AddRange(venueSlots);
            }

            return new BranchScheduleResult
            {
                RankedMovies = ranked,
                Schedule = allSlots
            };
        }

        private static List<ScheduleSlot> ScheduleVenue(
            Venue venue, Branch branch,
            List<RankedMovie> ranked,
            Dictionary<string, MapiMovie> movieLookup,
            HashSet<string> occupiedSlots,
            DateTime weekStart,
            PythonPredictorClient predictor)
        {
            List<RankedMovie> candidates = BuildShortlist(ranked, venue);
            if (candidates.Count == 0)
                return new List<ScheduleSlot>();

            List<DateTime> slotTimes = BuildSlotTimes(weekStart);

            List<PythonPredictionPayload> batchPayloads = new List<PythonPredictionPayload>(candidates.Count * SlotsPerWeek);
            for (int c = 0; c < candidates.Count; c++)
            {
                MapiMovie movie = movieLookup[candidates[c].MovieEdi];
                for (int s = 0; s < slotTimes.Count; s++)
                    batchPayloads.Add(SlotPrediction.BuildPayloadForWeekly(movie, venue, branch, slotTimes[s]));
            }

            PythonBatchResponse batch = predictor.PredictBatch(batchPayloads);
            if (batch.Predictions.Count != batchPayloads.Count)
                throw new Exception("Venue prediction batch count mismatch for venue " + venue.VenueId);

            int[][] scores = new int[candidates.Count][];
            for (int c = 0; c < candidates.Count; c++)
            {
                scores[c] = new int[SlotsPerWeek];
                for (int s = 0; s < SlotsPerWeek; s++)
                    scores[c][s] = batch.Predictions[c * SlotsPerWeek + s].PredictedTickets;
            }

            int venueCapacity = venue.Capacity > 0 ? venue.Capacity : 1;

            HashSet<string>[] moviesPerDay = new HashSet<string>[7];
            for (int d = 0; d < 7; d++)
                moviesPerDay[d] = new HashSet<string>();

            List<ScheduleSlot> result = new List<ScheduleSlot>();

            for (int s = 0; s < SlotsPerWeek; s++)
            {
                int dayIndex = s / Hours.Length;
                int hour = Hours[s % Hours.Length];
                DateTime slotTime = slotTimes[s];
                string dateIso = slotTime.ToString("yyyy-MM-dd");

                int bestCandidate = -1;
                int bestTickets = -1;

                for (int c = 0; c < candidates.Count; c++)
                {
                    if (moviesPerDay[dayIndex].Contains(candidates[c].MovieEdi)) continue;
                    if (!IsSlotEligible(candidates[c], hour)) continue;
                    if (occupiedSlots.Contains(candidates[c].MovieEdi + "|" + dateIso + "|" + hour)) continue;

                    if (scores[c][s] > bestTickets)
                    {
                        bestTickets = scores[c][s];
                        bestCandidate = c;
                    }
                }

                if (bestCandidate < 0)
                    continue;

                RankedMovie winner = candidates[bestCandidate];
                moviesPerDay[dayIndex].Add(winner.MovieEdi);
                occupiedSlots.Add(winner.MovieEdi + "|" + dateIso + "|" + hour);

                double occupancy = (double)bestTickets / venueCapacity;
                if (occupancy > 1.0) occupancy = 1.0;
                if (occupancy < 0.0) occupancy = 0.0;

                result.Add(new ScheduleSlot
                {
                    VenueId = venue.VenueId,
                    VenueName = venue.VenueName,
                    MovieEdi = winner.MovieEdi,
                    MovieTitle = winner.Title,
                    DayIndex = dayIndex,
                    DateIso = dateIso,
                    Hour = hour,
                    PredictedTickets = bestTickets,
                    Occupancy = occupancy
                });
            }

            return result;
        }

        private static List<RankedMovie> BuildShortlist(List<RankedMovie> ranked, Venue venue)
        {
            List<RankedMovie> shortlist = new List<RankedMovie>();
            for (int i = 0; i < ranked.Count && shortlist.Count < ShortlistSize; i++)
            {
                if (ranked[i].Is3D && !venue.Has3D)
                    continue;
                shortlist.Add(ranked[i]);
            }
            return shortlist;
        }

        private static Venue FindAverageVenue(List<Venue> activeVenues)
        {
            int mid = activeVenues.Count / 2;
            return activeVenues[mid];
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

        private static bool IsSlotEligible(RankedMovie movie, int hour)
        {
            if (IsHorrorOrThriller(movie.Genre)) return hour == 22 || hour == 23;
            if (IsFamilyOrKids(movie.Genre)) return hour >= 10 && hour <= 16;
            return true;
        }

        private static bool IsHorrorOrThriller(string genre)
        {
            if (string.IsNullOrEmpty(genre)) return false;
            string g = genre.ToUpperInvariant();
            return g.Contains("HORROR") || g.Contains("THRILLER");
        }

        private static bool IsFamilyOrKids(string genre)
        {
            if (string.IsNullOrEmpty(genre)) return false;
            string g = genre.ToUpperInvariant();
            return g.Contains("FAMILY") || g.Contains("ANIMATION") || g.Contains("KIDS");
        }
    }
}

using CinemaSyncServer.Services;
using System;
using System.Collections.Generic;
using System.Globalization;

namespace CinemaSyncServer.Models
{
    public class SlotPrediction
    {
        private static readonly string[] ValidCinemas = new string[]
        {
            "Ashdod", "Ashkelon", "Carmiel", "Haifa", "KfarSaba",
            "Kiryon", "Modiin", "Nahariya", "PetahTikva", "Rehovot"
        };

        private static readonly string[] ValidGenres = new string[]
        {
            "Action", "Adventure", "Animation", "Biography", "Comedy", "Crime",
            "Documentary", "Drama", "Family", "Fantasy", "History", "Horror",
            "Kids", "Live_Shows", "Music", "Musical", "Mystery", "Romance",
            "Sci_Fi", "Short", "Sport", "Thriller", "War", "Western"
        };

        public static PredictionResult Predict(PredictionRequest req, MapiService mapiService, PythonPredictorClient predictor)
        {
            if (req == null)
                throw new Exception("Prediction request is missing");
            if (string.IsNullOrWhiteSpace(req.MovieEdi))
                throw new Exception("Movie EDI is required");
            if (req.VenueId <= 0)
                throw new Exception("Invalid venue id");
            if (req.SlotDateTime == default)
                throw new Exception("Slot date/time is required");

            Venue venue = Venue.GetById(req.VenueId);
            Branch branch = Branch.GetById(venue.BranchCode);
            MapiMovie movie = FindMovie(mapiService, req.MovieEdi);

            PythonPredictionPayload payload = BuildPayload(movie, venue, branch, req.SlotDateTime);
            PythonPredictionResponse response = predictor.Predict(payload);

            int attendees = response.PredictedTickets;
            int capacity = venue.Capacity > 0 ? venue.Capacity : 1;
            double occupancy = (double)attendees / capacity;
            if (occupancy > 1.0) occupancy = 1.0;
            if (occupancy < 0.0) occupancy = 0.0;

            List<FactorContribution> contributions = new List<FactorContribution>();
            for (int i = 0; i < response.Factors.Count; i++)
            {
                PythonFactorContribution f = response.Factors[i];
                contributions.Add(new FactorContribution
                {
                    Label = f.Label,
                    Feature = f.Feature,
                    InputValue = f.InputValue,
                    ShapValue = f.ShapValue,
                    Explanation = f.Explanation
                });
            }

            return new PredictionResult
            {
                Occupancy = occupancy,
                Capacity = venue.Capacity,
                EstimatedAttendees = attendees,
                BaseTickets = response.BaseValue,
                TopContributions = contributions
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

        public static PythonPredictionPayload BuildPayloadForWeekly(MapiMovie movie, Venue venue, Branch branch, DateTime slot)
        {
            return BuildPayload(movie, venue, branch, slot);
        }

        private static PythonPredictionPayload BuildPayload(MapiMovie movie, Venue venue, Branch branch, DateTime slot)
        {
            PythonPredictionPayload p = new PythonPredictionPayload();

            p.Cinema = MapBranchToCinema(branch);
            p.Genres = ParseGenres(movie.Genre);
            p.Country = "Other";
            p.Month = slot.Month;
            p.Season = MonthToSeason(slot.Month);
            p.Hour = slot.Hour;
            p.TimeSlot = HourToTimeSlot(slot.Hour);
            p.Weekday = DayOfWeekToIsraeli(slot.DayOfWeek);
            p.MovieWeek = ComputeMovieWeek(movie.ReleaseDate, slot);
            p.LengthMin = movie.Length > 0 ? movie.Length : 100;
            p.VenueCapacity = venue.Capacity > 0 ? venue.Capacity : 100;
            p.ImdbRating = 0;
            p.Metascore = 0;
            p.ImdbVotes = 0;
            p.Boxoffice = 0;
            p.NumWins = 0;
            p.NumNominations = 0;
            p.IsHebrewLocal = ContainsHebrew(movie.OriginalName) ? 1 : 0;
            p.IsDubbed = movie.IsDubbed ? 1 : 0;
            p.IsSubtitled = 1;

            return p;
        }

        private static string MapBranchToCinema(Branch branch)
        {
            string city = branch.City ?? "";
            for (int i = 0; i < ValidCinemas.Length; i++)
            {
                if (city.Equals(ValidCinemas[i], StringComparison.OrdinalIgnoreCase))
                    return ValidCinemas[i];
            }

            string branchName = branch.BranchName ?? "";
            for (int i = 0; i < ValidCinemas.Length; i++)
            {
                if (branchName.IndexOf(ValidCinemas[i], StringComparison.OrdinalIgnoreCase) >= 0)
                    return ValidCinemas[i];
            }

            return "Haifa";
        }

        private static List<string> ParseGenres(string genreStr)
        {
            List<string> result = new List<string>();
            if (string.IsNullOrWhiteSpace(genreStr))
            {
                result.Add("Drama");
                return result;
            }

            string[] parts = genreStr.Split(new char[] { ',', ';', '|', '/' });
            for (int i = 0; i < parts.Length; i++)
            {
                string normalized = parts[i].Trim().Replace("-", "_").Replace(" ", "_");
                for (int j = 0; j < ValidGenres.Length; j++)
                {
                    if (normalized.Equals(ValidGenres[j], StringComparison.OrdinalIgnoreCase))
                    {
                        if (!result.Contains(ValidGenres[j]))
                            result.Add(ValidGenres[j]);
                        break;
                    }
                }
            }

            if (result.Count == 0)
                result.Add("Drama");

            return result;
        }

        private static string MonthToSeason(int month)
        {
            if (month >= 3 && month <= 5) return "Spring";
            if (month >= 6 && month <= 8) return "Summer";
            if (month >= 9 && month <= 11) return "Autumn";
            return "Winter";
        }

        private static string HourToTimeSlot(int hour)
        {
            if (hour == 0 || hour >= 21) return "Night";
            if (hour < 12) return "Morning";
            if (hour < 17) return "Noon";
            return "Evening";
        }

        private static int DayOfWeekToIsraeli(DayOfWeek dow)
        {
            return ((int)dow) + 1;
        }

        private static int ComputeMovieWeek(string releaseDateStr, DateTime slot)
        {
            if (string.IsNullOrWhiteSpace(releaseDateStr))
                return 1;

            DateTime releaseDate;
            string[] formats = new string[] { "yyyy-MM-dd", "dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-ddTHH:mm:ss" };
            bool parsed = DateTime.TryParseExact(releaseDateStr, formats, CultureInfo.InvariantCulture, DateTimeStyles.None, out releaseDate);
            if (!parsed)
            {
                if (!DateTime.TryParse(releaseDateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out releaseDate))
                    return 1;
            }

            TimeSpan diff = slot - releaseDate;
            int week = (int)(diff.TotalDays / 7) + 1;
            return week > 0 ? week : 1;
        }

        private static bool ContainsHebrew(string text)
        {
            if (string.IsNullOrEmpty(text)) return false;
            for (int i = 0; i < text.Length; i++)
            {
                char c = text[i];
                if (c >= 0x0590 && c <= 0x05FF) return true;
            }
            return false;
        }
    }
}

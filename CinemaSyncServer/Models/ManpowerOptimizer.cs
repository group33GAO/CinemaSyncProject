using System;
using System.Collections.Generic;
using CinemaSyncServer.Services;

namespace CinemaSyncServer.Models
{
    public class ManpowerOptimizer
    {
        private static readonly List<StaffingTier> Tiers = new List<StaffingTier>
        {
            new StaffingTier { MaxGuests = 0,   ServiceHost = 1, ViewingExperience = 1, SalesReps = 0, Ushers = 0, Total = 2,  FirstScreeningTotal = 3  },
            new StaffingTier { MaxGuests = 25,  ServiceHost = 1, ViewingExperience = 1, SalesReps = 1, Ushers = 1, Total = 4,  FirstScreeningTotal = 3  },
            new StaffingTier { MaxGuests = 50,  ServiceHost = 1, ViewingExperience = 1, SalesReps = 1, Ushers = 2, Total = 5,  FirstScreeningTotal = 4  },
            new StaffingTier { MaxGuests = 100, ServiceHost = 1, ViewingExperience = 1, SalesReps = 1, Ushers = 3, Total = 6,  FirstScreeningTotal = 5  },
            new StaffingTier { MaxGuests = 150, ServiceHost = 1, ViewingExperience = 1, SalesReps = 2, Ushers = 4, Total = 8,  FirstScreeningTotal = 6  },
            new StaffingTier { MaxGuests = 200, ServiceHost = 1, ViewingExperience = 1, SalesReps = 3, Ushers = 4, Total = 9,  FirstScreeningTotal = 7  },
            new StaffingTier { MaxGuests = 300, ServiceHost = 1, ViewingExperience = 1, SalesReps = 4, Ushers = 5, Total = 11, FirstScreeningTotal = 8  },
            new StaffingTier { MaxGuests = 400, ServiceHost = 1, ViewingExperience = 1, SalesReps = 5, Ushers = 6, Total = 13, FirstScreeningTotal = 9  },
            new StaffingTier { MaxGuests = 500, ServiceHost = 1, ViewingExperience = 1, SalesReps = 5, Ushers = 7, Total = 14, FirstScreeningTotal = 10 },
            new StaffingTier { MaxGuests = 750, ServiceHost = 1, ViewingExperience = 1, SalesReps = 7, Ushers = 8, Total = 17, FirstScreeningTotal = 11 }
        };

        public static ManpowerResult Calculate(ManpowerRequest req)
        {
            if (req == null)
                throw new Exception("Manpower request is missing");

            int dailyGuests = req.BaseGuests > 0 ? req.BaseGuests : 2000;
            ManpowerResult result = StaffForDay(dailyGuests);
            ApplyParameterBumps(result, req);
            return result;
        }

        public static ManpowerResult StaffForDay(int dailyGuests)
        {
            if (dailyGuests < 0) dailyGuests = 0;

            int serviceHost = 1;
            int viewing = 1;
            int salesReps = CeilDiv(dailyGuests, 3000);
            int ushers = CeilDiv(dailyGuests, 2200);

            if (salesReps < 1) salesReps = 1;
            if (ushers < 1) ushers = 1;

            return new ManpowerResult
            {
                EstimatedGuests = dailyGuests,
                TierGuests = 0,
                IsFirstScreening = false,
                ServiceHost = serviceHost,
                ViewingExperience = viewing,
                SalesReps = salesReps,
                Ushers = ushers,
                TotalStaff = serviceHost + viewing + salesReps + ushers
            };
        }

        private static int CeilDiv(int a, int b)
        {
            if (a <= 0) return 0;
            return (a + b - 1) / b;
        }

        private static void ApplyParameterBumps(ManpowerResult result, ManpowerRequest req)
        {
            if (string.Equals(req.Weather, "rainy", StringComparison.OrdinalIgnoreCase))
                result.Ushers += 1;

            if (string.Equals(req.Events, "major", StringComparison.OrdinalIgnoreCase))
                result.SalesReps += 1;

            if (req.IsHoliday)
            {
                result.SalesReps += 1;
                result.Ushers += 1;
            }

            if (req.IsPremiere)
                result.ServiceHost += 1;

            if (req.IsSchoolVacation)
            {
                result.SalesReps += 1;
                result.Ushers += 1;
            }

            if (req.IsHostedEvent)
            {
                result.ServiceHost += 1;
                result.Ushers += 1;
            }

            result.TotalStaff = result.ServiceHost + result.ViewingExperience + result.SalesReps + result.Ushers;
        }

        public static ManpowerDayGuestsResult GetDayGuests(ManpowerDayGuestsRequest req, MapiService mapiService, PythonPredictorClient predictor)
        {
            if (req == null)
                throw new Exception("Day guests request is missing");
            if (req.Date == default)
                throw new Exception("Date is required");

            DateTime date = req.Date.Date;
            int dayIndex = (int)date.DayOfWeek;
            DateTime weekStart = date.AddDays(-dayIndex);

            BranchScheduleRequest scheduleRequest = new BranchScheduleRequest
            {
                BranchCode = req.BranchCode,
                WeekStartDate = weekStart
            };

            BranchScheduleResult schedule = BranchScheduler.Schedule(scheduleRequest, mapiService, predictor);

            int guests = 0;
            int screenings = 0;
            if (schedule != null && schedule.Schedule != null)
            {
                for (int i = 0; i < schedule.Schedule.Count; i++)
                {
                    if (schedule.Schedule[i].DayIndex == dayIndex)
                    {
                        guests += schedule.Schedule[i].PredictedTickets;
                        screenings++;
                    }
                }
            }

            int avgPerScreening = screenings > 0 ? (int)Math.Round((double)guests / screenings) : 0;

            return new ManpowerDayGuestsResult
            {
                DateIso = date.ToString("yyyy-MM-dd"),
                DailyGuests = guests,
                Screenings = screenings,
                AvgPerScreening = avgPerScreening
            };
        }

        public static ManpowerWeekResult CalculateForWeek(ManpowerWeekRequest req, MapiService mapiService, PythonPredictorClient predictor)
        {
            if (req == null)
                throw new Exception("Manpower week request is missing");

            BranchScheduleRequest scheduleRequest = new BranchScheduleRequest
            {
                BranchCode = req.BranchCode,
                WeekStartDate = req.WeekStartDate
            };

            BranchScheduleResult schedule = BranchScheduler.Schedule(scheduleRequest, mapiService, predictor);

            int[] dailyGuests = new int[7];
            int[] dailyScreenings = new int[7];
            if (schedule != null && schedule.Schedule != null)
            {
                for (int i = 0; i < schedule.Schedule.Count; i++)
                {
                    ScheduleSlot slot = schedule.Schedule[i];
                    if (slot.DayIndex >= 0 && slot.DayIndex < 7)
                    {
                        dailyGuests[slot.DayIndex] += slot.PredictedTickets;
                        dailyScreenings[slot.DayIndex]++;
                    }
                }
            }

            DateTime weekStart = req.WeekStartDate.Date;
            ManpowerWeekResult result = new ManpowerWeekResult();

            for (int d = 0; d < 7; d++)
            {
                int avgPerScreening = dailyScreenings[d] > 0 ? (int)Math.Round((double)dailyGuests[d] / dailyScreenings[d]) : 0;
                ManpowerResult staff = StaffForDay(dailyGuests[d]);
                DateTime day = weekStart.AddDays(d);

                result.Days.Add(new ManpowerDay
                {
                    DayIndex = d,
                    DateIso = day.ToString("yyyy-MM-dd"),
                    TotalGuests = dailyGuests[d],
                    Screenings = dailyScreenings[d],
                    AvgPerScreening = avgPerScreening,
                    TierGuests = staff.TierGuests,
                    ServiceHost = staff.ServiceHost,
                    ViewingExperience = staff.ViewingExperience,
                    SalesReps = staff.SalesReps,
                    Ushers = staff.Ushers,
                    TotalStaff = staff.TotalStaff
                });

                result.WeekTotalGuests += dailyGuests[d];
                result.WeekTotalStaff += staff.TotalStaff;
                result.WeekTotalScreenings += dailyScreenings[d];
            }

            List<Venue> venues = Venue.GetByBranch(req.BranchCode);
            int venueCount = 0;
            for (int i = 0; i < venues.Count; i++)
                if (venues[i].IsActive) venueCount++;
            result.VenueCount = venueCount;

            return result;
        }

        public static ManpowerResult Lookup(int estimatedGuests, bool isFirstScreening)
        {
            StaffingTier tier = MatchTier(estimatedGuests);
            int total = isFirstScreening ? tier.FirstScreeningTotal : tier.Total;

            return new ManpowerResult
            {
                EstimatedGuests = estimatedGuests,
                TierGuests = tier.MaxGuests,
                IsFirstScreening = isFirstScreening,
                ServiceHost = tier.ServiceHost,
                ViewingExperience = tier.ViewingExperience,
                SalesReps = tier.SalesReps,
                Ushers = tier.Ushers,
                TotalStaff = total
            };
        }

        private static StaffingTier MatchTier(int estimatedGuests)
        {
            if (estimatedGuests <= 0)
                return Tiers[0];

            for (int i = 0; i < Tiers.Count; i++)
            {
                if (estimatedGuests <= Tiers[i].MaxGuests)
                    return Tiers[i];
            }

            return Tiers[Tiers.Count - 1];
        }
    }
}

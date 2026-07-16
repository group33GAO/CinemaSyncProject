using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace CinemaSyncServer.Services
{
    public class PythonPredictorClient
    {
        private const string PredictUrl = "http://127.0.0.1:8000/predict";
        private const string PredictBatchUrl = "http://127.0.0.1:8000/predict-batch";
        private const string HealthUrl = "http://127.0.0.1:8000/health";

        private readonly IHttpClientFactory httpClientFactory;

        public PythonPredictorClient(IHttpClientFactory httpClientFactory)
        {
            this.httpClientFactory = httpClientFactory;
        }

        public bool IsReady()
        {
            try
            {
                HttpClient client = httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(4);
                HttpResponseMessage response = client.GetAsync(HealthUrl).Result;
                return response.IsSuccessStatusCode;
            }
            catch (Exception)
            {
                // Service unreachable (not started yet, or model still loading) -> not ready.
                return false;
            }
        }

        public PythonPredictionResponse Predict(PythonPredictionPayload payload)
        {
            if (payload == null)
                throw new Exception("Prediction payload is missing");

            HttpClient client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(60);

            HttpResponseMessage response = client.PostAsJsonAsync(PredictUrl, payload).Result;

            string body = response.Content.ReadAsStringAsync().Result;
            if (!response.IsSuccessStatusCode)
            {
                throw new Exception("Python prediction service failed (HTTP " + (int)response.StatusCode + "): " + body);
            }

            JsonSerializerOptions options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            PythonPredictionResponse result = JsonSerializer.Deserialize<PythonPredictionResponse>(body, options);

            if (result == null)
                throw new Exception("Empty response from prediction service");

            return result;
        }

        public PythonBatchResponse PredictBatch(List<PythonPredictionPayload> payloads)
        {
            if (payloads == null || payloads.Count == 0)
                throw new Exception("Batch payload is empty");

            PythonBatchPayload wrapped = new PythonBatchPayload { Requests = payloads };

            HttpClient client = httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(120);

            HttpResponseMessage response = client.PostAsJsonAsync(PredictBatchUrl, wrapped).Result;

            string body = response.Content.ReadAsStringAsync().Result;
            if (!response.IsSuccessStatusCode)
            {
                throw new Exception("Python batch prediction failed (HTTP " + (int)response.StatusCode + "): " + body);
            }

            JsonSerializerOptions options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            PythonBatchResponse result = JsonSerializer.Deserialize<PythonBatchResponse>(body, options);

            if (result == null)
                throw new Exception("Empty response from batch prediction");

            return result;
        }
    }

    public class PythonPredictionPayload
    {
        [JsonPropertyName("cinema")]
        public string Cinema { get; set; }

        [JsonPropertyName("genres")]
        public List<string> Genres { get; set; }

        [JsonPropertyName("country")]
        public string Country { get; set; }

        [JsonPropertyName("month")]
        public int Month { get; set; }

        [JsonPropertyName("season")]
        public string Season { get; set; }

        [JsonPropertyName("timeslot")]
        public string TimeSlot { get; set; }

        [JsonPropertyName("hour")]
        public int Hour { get; set; }

        [JsonPropertyName("weekday")]
        public int Weekday { get; set; }

        [JsonPropertyName("movie_week")]
        public int MovieWeek { get; set; }

        [JsonPropertyName("length_min")]
        public int LengthMin { get; set; }

        [JsonPropertyName("venue_capacity")]
        public int VenueCapacity { get; set; }

        [JsonPropertyName("imdb_rating")]
        public double ImdbRating { get; set; }

        [JsonPropertyName("metascore")]
        public double Metascore { get; set; }

        [JsonPropertyName("imdb_votes")]
        public double ImdbVotes { get; set; }

        [JsonPropertyName("boxoffice")]
        public double Boxoffice { get; set; }

        [JsonPropertyName("num_wins")]
        public int NumWins { get; set; }

        [JsonPropertyName("num_nominations")]
        public int NumNominations { get; set; }

        [JsonPropertyName("is_hebrew_local")]
        public int IsHebrewLocal { get; set; }

        [JsonPropertyName("is_dubbed")]
        public int IsDubbed { get; set; }

        [JsonPropertyName("is_subtitled")]
        public int IsSubtitled { get; set; }
    }

    public class PythonPredictionResponse
    {
        [JsonPropertyName("predicted_tickets")]
        public int PredictedTickets { get; set; }

        [JsonPropertyName("occupancy_percent")]
        public double OccupancyPercent { get; set; }

        [JsonPropertyName("raw_prediction")]
        public double RawPrediction { get; set; }

        [JsonPropertyName("base_value")]
        public double BaseValue { get; set; }

        [JsonPropertyName("factors")]
        public List<PythonFactorContribution> Factors { get; set; } = new List<PythonFactorContribution>();
    }

    public class PythonFactorContribution
    {
        [JsonPropertyName("feature")]
        public string Feature { get; set; }

        [JsonPropertyName("label")]
        public string Label { get; set; }

        [JsonPropertyName("input_value")]
        public double InputValue { get; set; }

        [JsonPropertyName("shap_value")]
        public double ShapValue { get; set; }

        [JsonPropertyName("explanation")]
        public string Explanation { get; set; }
    }

    public class PythonBatchPayload
    {
        [JsonPropertyName("requests")]
        public List<PythonPredictionPayload> Requests { get; set; }
    }

    public class PythonBatchResponse
    {
        [JsonPropertyName("predictions")]
        public List<PythonBatchItem> Predictions { get; set; } = new List<PythonBatchItem>();
    }

    public class PythonBatchItem
    {
        [JsonPropertyName("predicted_tickets")]
        public int PredictedTickets { get; set; }

        [JsonPropertyName("occupancy_percent")]
        public double OccupancyPercent { get; set; }

        [JsonPropertyName("raw_prediction")]
        public double RawPrediction { get; set; }
    }
}

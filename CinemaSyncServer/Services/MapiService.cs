using CinemaSyncServer.Models;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace CinemaSyncServer.Services
{
    public class MapiService
    {
        private readonly IHttpClientFactory httpClientFactory;
        private readonly IConfiguration configuration;

        private string cachedToken;
        private DateTime tokenFetchedAt;
        private readonly TimeSpan tokenLifetime = TimeSpan.FromHours(1);
        private readonly object tokenLock = new object();

        public MapiService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            this.httpClientFactory = httpClientFactory;
            this.configuration = configuration;
        }

        public List<MapiMovie> GetEventMasters()
        {
            string token = GetValidToken();
            string baseUrl = configuration["Mapi:BaseUrl"];
            string url = baseUrl + "/group/eventMasters?full=true";

            HttpClient client = httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            HttpResponseMessage response = client.GetAsync(url).Result;

            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                cachedToken = null;
                token = GetValidToken();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
                response = client.GetAsync(url).Result;
            }

            response.EnsureSuccessStatusCode();

            string json = response.Content.ReadAsStringAsync().Result;
            JsonDocument doc = JsonDocument.Parse(json);

            List<MapiMovie> movies = new List<MapiMovie>();
            JsonElement eventMasters = doc.RootElement.GetProperty("eventMasters");

            foreach (JsonElement item in eventMasters.EnumerateArray())
            {
                MapiMovie movie = new MapiMovie();
                movie.Edi = GetStringProp(item, "edi");
                movie.Title = GetStringProp(item, "title");
                movie.OriginalName = GetStringProp(item, "originalName");
                movie.ReleaseDate = GetStringProp(item, "releaseDate");
                movie.Length = GetIntProp(item, "length");
                movie.IsDubbed = GetStringProp(item, "isDubbed") == "1";
                movie.Is3D = HasAttr(item, "3D");
                movie.Genre = GetCatsAsString(item);
                movie.Rank = GetIntProp(item, "rank");
                movies.Add(movie);
            }

            return movies;
        }

        private string GetValidToken()
        {
            lock (tokenLock)
            {
                bool expired = cachedToken == null || (DateTime.UtcNow - tokenFetchedAt) > tokenLifetime;
                if (expired)
                {
                    cachedToken = Login();
                    tokenFetchedAt = DateTime.UtcNow;
                }
                return cachedToken;
            }
        }

        private string Login()
        {
            string baseUrl = configuration["Mapi:BaseUrl"];
            string url = baseUrl + "/login";

            var payload = new
            {
                accessCode = configuration["Mapi:AccessCode"],
                username = configuration["Mapi:Username"],
                password = configuration["Mapi:Password"]
            };

            HttpClient client = httpClientFactory.CreateClient();
            HttpResponseMessage response = client.PostAsJsonAsync(url, payload).Result;
            response.EnsureSuccessStatusCode();

            string json = response.Content.ReadAsStringAsync().Result;
            JsonDocument doc = JsonDocument.Parse(json);
            return doc.RootElement.GetProperty("token").GetString();
        }

        private string GetStringProp(JsonElement item, string propName)
        {
            if (!item.TryGetProperty(propName, out JsonElement prop)) return null;
            if (prop.ValueKind == JsonValueKind.Null) return null;
            return prop.ToString();
        }

        private int GetIntProp(JsonElement item, string propName)
        {
            if (!item.TryGetProperty(propName, out JsonElement prop)) return 0;
            if (prop.ValueKind == JsonValueKind.Number) return prop.GetInt32();
            if (prop.ValueKind == JsonValueKind.String)
            {
                int result;
                int.TryParse(prop.GetString(), out result);
                return result;
            }
            return 0;
        }

        private bool HasAttr(JsonElement item, string attrName)
        {
            if (!item.TryGetProperty("attrs", out JsonElement attrs)) return false;
            if (attrs.ValueKind != JsonValueKind.Array) return false;
            foreach (JsonElement a in attrs.EnumerateArray())
            {
                if (a.GetString() == attrName) return true;
            }
            return false;
        }

        private string GetCatsAsString(JsonElement item)  //מתודה שנועדה לפרק את הקטגרויות מאחר והן מגיעות כמערך
        {
            if (!item.TryGetProperty("cats", out JsonElement cats)) return "";
            if (cats.ValueKind != JsonValueKind.Array) return "";
            StringBuilder sb = new StringBuilder();
            foreach (JsonElement c in cats.EnumerateArray())
            {
                if (sb.Length > 0) sb.Append(", ");
                sb.Append(c.GetString());
            }
            return sb.ToString();
        }
    }
}
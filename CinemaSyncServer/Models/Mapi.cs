using CinemaSyncServer.Services;
using System.Collections.Generic;

namespace CinemaSyncServer.Models
{
    public class Mapi
    {
        public static List<MapiMovie> GetMovies(MapiService service)
        {
            return service.GetEventMasters();
        }
    }
}

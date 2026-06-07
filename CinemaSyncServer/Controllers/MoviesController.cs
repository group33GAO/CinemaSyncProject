using CinemaSyncServer.Models;
using CinemaSyncServer.Services;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;

namespace CinemaSyncServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MoviesController : ControllerBase
    {
        private readonly MapiService mapiService;

        public MoviesController(MapiService mapiService)
        {
            this.mapiService = mapiService;
        }

        [HttpGet("from-mapi")]
        public List<MapiMovie> GetFromMapi()
        {
            return Mapi.GetMovies(mapiService);
        }
    }
}

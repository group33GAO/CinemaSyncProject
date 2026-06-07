using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using CinemaSyncServer.Models;

namespace CinemaSyncServer.Controllers
{
    public class RegisterRequest
    {
        public string Email { get; set; }
        public string FullName { get; set; }
        public string Role { get; set; }
        public int? BranchCode { get; set; }
        public string Password { get; set; }
    }

    public class LoginRequest
    {
        public string Email { get; set; }
        public string Password { get; set; }
    }

    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        [HttpGet]
        public List<User> Get()
        {
            return CinemaSyncServer.Models.User.GetAll();
        }

        [HttpGet("{userId}")]
        public User Get(int userId)
        {
            return CinemaSyncServer.Models.User.GetById(userId);
        }

        [HttpPost("register")]
        public int Register([FromBody] RegisterRequest request)
        {
            User user = new User
            {
                Email = request.Email,
                FullName = request.FullName,
                Role = request.Role,
                BranchCode = request.BranchCode
            };
            return CinemaSyncServer.Models.User.Register(user, request.Password);
        }

        [HttpPost("login")]
        public User Login([FromBody] LoginRequest request)
        {
            return CinemaSyncServer.Models.User.Login(request.Email, request.Password);
        }

        [HttpPut]
        public bool Put([FromBody] User user)
        {
            return CinemaSyncServer.Models.User.Update(user);
        }

        [HttpDelete("{userId}")]
        public bool Delete(int userId)
        {
            return CinemaSyncServer.Models.User.Delete(userId);
        }
    }
}

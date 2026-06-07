using CinemaSyncServer.DAL;
using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace CinemaSyncServer.Models
{
    public class User
    {
        public int UserId { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public string FullName { get; set; }
        public string Role { get; set; }
        public int? BranchCode { get; set; }
        public DateTime? LastLogin { get; set; }

        private static readonly string[] AllowedRoles =
            { "Manager", "Regional", "Procurement", "Content", "Staff" };

        public User() { }

        public static List<User> GetAll()
        {
            DBservices db = new DBservices();
            return db.GetAllUsers();
        }

        public static User GetById(int userId)
        {
            if (userId <= 0)
                throw new Exception("Invalid user id");

            DBservices db = new DBservices();
            User user = db.GetUserById(userId);

            if (user == null)
                throw new Exception("User not found");

            return user;
        }

        public static int Register(User user, string plainPassword)
        {
            if (user == null)
                throw new Exception("User data is missing");

            if (string.IsNullOrWhiteSpace(user.Email))
                throw new Exception("Email is required");

            if (!user.Email.Contains("@"))
                throw new Exception("Invalid email format");

            if (string.IsNullOrWhiteSpace(plainPassword))
                throw new Exception("Password is required");

            if (plainPassword.Length < 6)
                throw new Exception("Password must be at least 6 characters");

            if (string.IsNullOrWhiteSpace(user.FullName))
                throw new Exception("Full name is required");

            if (string.IsNullOrWhiteSpace(user.Role))
                throw new Exception("Role is required");

            bool roleValid = false;
            foreach (string role in AllowedRoles)
            {
                if (role == user.Role)
                {
                    roleValid = true;
                    break;
                }
            }
            if (!roleValid)
                throw new Exception("Invalid role");

            DBservices db = new DBservices();
            User existingUser = db.GetUserByEmail(user.Email);
            if (existingUser != null)
                throw new Exception("Email is already registered");

            user.PasswordHash = HashPassword(plainPassword);

            int newUserId = db.InsertUser(user);
            if (newUserId == 0)
                throw new Exception("User was not registered");

            return newUserId;
        }

        public static User Login(string email, string plainPassword)
        {
            if (string.IsNullOrWhiteSpace(email))
                throw new Exception("Email is required");

            if (string.IsNullOrWhiteSpace(plainPassword))
                throw new Exception("Password is required");

            string hash = HashPassword(plainPassword);
            DBservices db = new DBservices();
            User user = db.LoginUser(email, hash);

            if (user == null)
                throw new Exception("Invalid email or password");

            return user;
        }

        public static bool Update(User user)
        {
            if (user == null)
                throw new Exception("User data is missing");

            if (user.UserId <= 0)
                throw new Exception("Invalid user id");

            if (string.IsNullOrWhiteSpace(user.FullName))
                throw new Exception("Full name is required");

            if (string.IsNullOrWhiteSpace(user.Role))
                throw new Exception("Role is required");

            bool roleValid = false;
            foreach (string role in AllowedRoles)
            {
                if (role == user.Role)
                {
                    roleValid = true;
                    break;
                }
            }
            if (!roleValid)
                throw new Exception("Invalid role");

            DBservices db = new DBservices();
            int numEffected = db.UpdateUser(user);

            if (numEffected == 0)
                throw new Exception("User was not updated");

            return true;
        }

        public static bool Delete(int userId)
        {
            if (userId <= 0)
                throw new Exception("Invalid user id");

            DBservices db = new DBservices();
            int numEffected = db.DeleteUser(userId);

            if (numEffected == 0)
                throw new Exception("User was not deleted");

            return true;
        }

        private static string HashPassword(string plainPassword)
        {
            SHA256 sha256 = SHA256.Create();
            byte[] bytes = Encoding.UTF8.GetBytes(plainPassword);
            byte[] hashBytes = sha256.ComputeHash(bytes);

            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < hashBytes.Length; i++)
            {
                sb.Append(hashBytes[i].ToString("x2"));
            }
            return sb.ToString();
        }
    }
}
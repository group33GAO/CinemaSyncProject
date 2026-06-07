using CinemaSyncServer.Models;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.IO;

namespace CinemaSyncServer.DAL
{
    public class DBservices
    {
        public DBservices() { }

        //--------------------------------------------------------------------------------------------------
        // This method opens a SqlConnection using the connection string from appsettings.json
        //--------------------------------------------------------------------------------------------------
        public SqlConnection connect(String conString)
        {
            IConfigurationRoot configuration = new ConfigurationBuilder()
                .AddJsonFile("appsettings.json")
                .Build();

            string cStr = configuration.GetConnectionString(conString);
            SqlConnection con = new SqlConnection(cStr);
            con.Open();
            return con;
        }

        //--------------------------------------------------------------------------------------------------
        // This method builds a SqlCommand for executing a stored procedure with parameters
        //--------------------------------------------------------------------------------------------------
        private SqlCommand CreateCommandWithStoredProcedureGeneral(String spName, SqlConnection con, Dictionary<string, object> paramDic)
        {
            SqlCommand cmd = new SqlCommand();
            cmd.Connection = con;
            cmd.CommandText = spName;
            cmd.CommandTimeout = 10;
            cmd.CommandType = CommandType.StoredProcedure;

            if (paramDic != null)
            {
                foreach (KeyValuePair<string, object> param in paramDic)
                {
                    cmd.Parameters.AddWithValue(param.Key, param.Value);
                }
            }
            return cmd;
        }

        //--------------------------------------------------------------------------------------------------
        // This method returns all branches from the Branches table
        //--------------------------------------------------------------------------------------------------
        public List<Branch> GetAllBranches()
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            cmd = CreateCommandWithStoredProcedureGeneral("SP_Branches_GetAll", con, paramDic);

            try
            {
                List<Branch> branches = new List<Branch>();
                SqlDataReader reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    Branch b = new Branch();
                    b.BranchCode = Convert.ToInt32(reader["BranchCode"]);
                    b.BranchName = reader["BranchName"].ToString();
                    b.City = reader["City"].ToString();
                    b.MapiSiteId = reader["MapiSiteId"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["MapiSiteId"]);
                    branches.Add(b);
                }
                return branches;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method returns a single branch by its branch code
        //--------------------------------------------------------------------------------------------------
        public Branch GetBranchById(int branchCode)
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@BranchCode", branchCode);
            cmd = CreateCommandWithStoredProcedureGeneral("SP_Branches_GetById", con, paramDic);

            try
            {
                Branch branch = null;
                SqlDataReader reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    branch = new Branch();
                    branch.BranchCode = Convert.ToInt32(reader["BranchCode"]);
                    branch.BranchName = reader["BranchName"].ToString();
                    branch.City = reader["City"].ToString();
                    branch.MapiSiteId = reader["MapiSiteId"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["MapiSiteId"]);
                }
                return branch;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method inserts a new branch into the Branches table
        //--------------------------------------------------------------------------------------------------
        public int InsertBranch(Branch branch)
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@BranchCode", branch.BranchCode);
            paramDic.Add("@BranchName", branch.BranchName);
            paramDic.Add("@City", branch.City);
            paramDic.Add("@MapiSiteId", branch.MapiSiteId.HasValue ? (object)branch.MapiSiteId.Value : DBNull.Value);
            cmd = CreateCommandWithStoredProcedureGeneral("SP_Branches_Insert", con, paramDic);

            try
            {
                int rowsAffected = Convert.ToInt32(cmd.ExecuteScalar());
                return rowsAffected;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method updates an existing branch in the Branches table
        //--------------------------------------------------------------------------------------------------
        public int UpdateBranch(Branch branch)
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@BranchCode", branch.BranchCode);
            paramDic.Add("@BranchName", branch.BranchName);
            paramDic.Add("@City", branch.City);
            paramDic.Add("@MapiSiteId", branch.MapiSiteId.HasValue ? (object)branch.MapiSiteId.Value : DBNull.Value);
            cmd = CreateCommandWithStoredProcedureGeneral("SP_Branches_Update", con, paramDic);

            try
            {
                int rowsAffected = Convert.ToInt32(cmd.ExecuteScalar());
                return rowsAffected;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method deletes a branch by its branch code
        //--------------------------------------------------------------------------------------------------
        public int DeleteBranch(int branchCode)
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@BranchCode", branchCode);
            cmd = CreateCommandWithStoredProcedureGeneral("SP_Branches_Delete", con, paramDic);

            try
            {
                int rowsAffected = Convert.ToInt32(cmd.ExecuteScalar());
                return rowsAffected;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method returns all users from the Users table (without PasswordHash)
        //--------------------------------------------------------------------------------------------------
        public List<User> GetAllUsers()
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            cmd = CreateCommandWithStoredProcedureGeneral("SP_Users_GetAll", con, paramDic);

            try
            {
                List<User> users = new List<User>();
                SqlDataReader reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    User u = new User();
                    u.UserId = Convert.ToInt32(reader["UserId"]);
                    u.Email = reader["Email"].ToString();
                    u.FullName = reader["FullName"].ToString();
                    u.Role = reader["Role"].ToString();
                    u.BranchCode = reader["BranchCode"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["BranchCode"]);
                    u.LastLogin = reader["LastLogin"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["LastLogin"]);
                    users.Add(u);
                }
                return users;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method returns a single user by its user id (without PasswordHash)
        //--------------------------------------------------------------------------------------------------
        public User GetUserById(int userId)
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@UserId", userId);
            cmd = CreateCommandWithStoredProcedureGeneral("SP_Users_GetById", con, paramDic);

            try
            {
                User user = null;
                SqlDataReader reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    user = new User();
                    user.UserId = Convert.ToInt32(reader["UserId"]);
                    user.Email = reader["Email"].ToString();
                    user.FullName = reader["FullName"].ToString();
                    user.Role = reader["Role"].ToString();
                    user.BranchCode = reader["BranchCode"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["BranchCode"]);
                    user.LastLogin = reader["LastLogin"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["LastLogin"]);
                }
                return user;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method returns a single user by its email (used for duplicate check before registration)
        //--------------------------------------------------------------------------------------------------
        public User GetUserByEmail(string email)
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@Email", email);
            cmd = CreateCommandWithStoredProcedureGeneral("SP_Users_GetByEmail", con, paramDic);

            try
            {
                User user = null;
                SqlDataReader reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    user = new User();
                    user.UserId = Convert.ToInt32(reader["UserId"]);
                    user.Email = reader["Email"].ToString();
                    user.FullName = reader["FullName"].ToString();
                    user.Role = reader["Role"].ToString();
                    user.BranchCode = reader["BranchCode"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["BranchCode"]);
                    user.LastLogin = reader["LastLogin"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["LastLogin"]);
                }
                return user;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method inserts a new user into the Users table and returns the new UserId
        //--------------------------------------------------------------------------------------------------
        public int InsertUser(User user)
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@Email", user.Email);
            paramDic.Add("@PasswordHash", user.PasswordHash);
            paramDic.Add("@FullName", user.FullName);
            paramDic.Add("@Role", user.Role);
            paramDic.Add("@BranchCode", user.BranchCode.HasValue ? (object)user.BranchCode.Value : DBNull.Value);
            cmd = CreateCommandWithStoredProcedureGeneral("SP_Users_Insert", con, paramDic);

            try
            {
                object result = cmd.ExecuteScalar();
                int newUserId = result == null || result == DBNull.Value ? 0 : Convert.ToInt32(result);
                return newUserId;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method verifies user credentials and returns the user record on match (updates LastLogin)
        //--------------------------------------------------------------------------------------------------
        public User LoginUser(string email, string passwordHash)
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@Email", email);
            paramDic.Add("@PasswordHash", passwordHash);
            cmd = CreateCommandWithStoredProcedureGeneral("SP_Users_Login", con, paramDic);

            try
            {
                User user = null;
                SqlDataReader reader = cmd.ExecuteReader();
                if (reader.Read())
                {
                    user = new User();
                    user.UserId = Convert.ToInt32(reader["UserId"]);
                    user.Email = reader["Email"].ToString();
                    user.FullName = reader["FullName"].ToString();
                    user.Role = reader["Role"].ToString();
                    user.BranchCode = reader["BranchCode"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["BranchCode"]);
                    user.LastLogin = reader["LastLogin"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["LastLogin"]);
                }
                return user;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method updates an existing user (does not change password or email)
        //--------------------------------------------------------------------------------------------------
        public int UpdateUser(User user)
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@UserId", user.UserId);
            paramDic.Add("@FullName", user.FullName);
            paramDic.Add("@Role", user.Role);
            paramDic.Add("@BranchCode", user.BranchCode.HasValue ? (object)user.BranchCode.Value : DBNull.Value);
            cmd = CreateCommandWithStoredProcedureGeneral("SP_Users_Update", con, paramDic);

            try
            {
                int rowsAffected = Convert.ToInt32(cmd.ExecuteScalar());
                return rowsAffected;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method deletes a user by its user id
        //--------------------------------------------------------------------------------------------------
        public int DeleteUser(int userId)
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@UserId", userId);
            cmd = CreateCommandWithStoredProcedureGeneral("SP_Users_Delete", con, paramDic);

            try
            {
                int rowsAffected = Convert.ToInt32(cmd.ExecuteScalar());
                return rowsAffected;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method returns all active venues for a given branch
        //--------------------------------------------------------------------------------------------------
        public List<Venue> GetVenuesByBranch(int branchCode)
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@BranchCode", branchCode);
            cmd = CreateCommandWithStoredProcedureGeneral("SP_Venues_GetByBranch", con, paramDic);

            try
            {
                List<Venue> venues = new List<Venue>();
                SqlDataReader reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    Venue v = new Venue();
                    v.VenueId = Convert.ToInt32(reader["VenueId"]);
                    v.BranchCode = Convert.ToInt32(reader["BranchCode"]);
                    v.VenueName = reader["VenueName"].ToString();
                    v.Capacity = Convert.ToInt32(reader["Capacity"]);
                    v.VenueType = reader["VenueType"].ToString();
                    v.Has3D = Convert.ToBoolean(reader["Has3D"]);
                    v.HasAtmos = Convert.ToBoolean(reader["HasAtmos"]);
                    v.IsActive = Convert.ToBoolean(reader["IsActive"]);
                    venues.Add(v);
                }
                return venues;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method returns a single venue by its venue id
        //--------------------------------------------------------------------------------------------------
        public Venue GetVenueById(int venueId)
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@VenueId", venueId);
            cmd = CreateCommandWithStoredProcedureGeneral("SP_Venues_GetById", con, paramDic);

            try
            {
                SqlDataReader reader = cmd.ExecuteReader();
                Venue v = null;
                if (reader.Read())
                {
                    v = new Venue();
                    v.VenueId = Convert.ToInt32(reader["VenueId"]);
                    v.BranchCode = Convert.ToInt32(reader["BranchCode"]);
                    v.VenueName = reader["VenueName"].ToString();
                    v.Capacity = Convert.ToInt32(reader["Capacity"]);
                    v.VenueType = reader["VenueType"].ToString();
                    v.Has3D = Convert.ToBoolean(reader["Has3D"]);
                    v.HasAtmos = Convert.ToBoolean(reader["HasAtmos"]);
                    v.IsActive = Convert.ToBoolean(reader["IsActive"]);
                }
                return v;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method returns all active products from the Products table
        //--------------------------------------------------------------------------------------------------
        public List<Product> GetAllProducts()
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            cmd = CreateCommandWithStoredProcedureGeneral("SP_Products_GetAll", con, paramDic);

            try
            {
                List<Product> products = new List<Product>();
                SqlDataReader reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    Product p = new Product();
                    p.ProductId = Convert.ToInt32(reader["ProductId"]);
                    p.Barcode = reader["Barcode"] == DBNull.Value ? null : reader["Barcode"].ToString();
                    p.ProductName = reader["ProductName"].ToString();
                    p.UnitsPerPackage = Convert.ToInt32(reader["UnitsPerPackage"]);
                    p.Supplier = reader["Supplier"].ToString();
                    p.SupplierMinOrder = reader["SupplierMinOrder"] == DBNull.Value ? null : reader["SupplierMinOrder"].ToString();
                    p.DefaultRequiredStock = reader["DefaultRequiredStock"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["DefaultRequiredStock"]);
                    p.Notes = reader["Notes"] == DBNull.Value ? null : reader["Notes"].ToString();
                    p.IsActive = Convert.ToBoolean(reader["IsActive"]);
                    products.Add(p);
                }
                return products;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method returns the inventory list for a specific branch (joined with Products)
        //--------------------------------------------------------------------------------------------------
        public List<BranchInventoryItem> GetBranchInventory(int branchCode)
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@BranchCode", branchCode);
            cmd = CreateCommandWithStoredProcedureGeneral("SP_BranchInventory_GetByBranch", con, paramDic);

            try
            {
                List<BranchInventoryItem> items = new List<BranchInventoryItem>();
                SqlDataReader reader = cmd.ExecuteReader();
                while (reader.Read())
                {
                    BranchInventoryItem item = new BranchInventoryItem();
                    item.ProductId = Convert.ToInt32(reader["ProductId"]);
                    item.Barcode = reader["Barcode"] == DBNull.Value ? null : reader["Barcode"].ToString();
                    item.ProductName = reader["ProductName"].ToString();
                    item.UnitsPerPackage = Convert.ToInt32(reader["UnitsPerPackage"]);
                    item.Supplier = reader["Supplier"].ToString();
                    item.SupplierMinOrder = reader["SupplierMinOrder"] == DBNull.Value ? null : reader["SupplierMinOrder"].ToString();
                    item.Notes = reader["Notes"] == DBNull.Value ? null : reader["Notes"].ToString();
                    item.CurrentStock = Convert.ToInt32(reader["CurrentStock"]);
                    item.RequiredStock = reader["RequiredStock"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["RequiredStock"]);
                    item.LastUpdated = reader["LastUpdated"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["LastUpdated"]);
                    items.Add(item);
                }
                return items;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method upserts the current stock for a branch/product pair in BranchInventory
        //--------------------------------------------------------------------------------------------------
        public int UpdateBranchInventoryStock(int branchCode, int productId, int currentStock)
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@BranchCode", branchCode);
            paramDic.Add("@ProductId", productId);
            paramDic.Add("@CurrentStock", currentStock);
            cmd = CreateCommandWithStoredProcedureGeneral("SP_BranchInventory_UpdateStock", con, paramDic);

            try
            {
                int rowsAffected = Convert.ToInt32(cmd.ExecuteScalar());
                return rowsAffected;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }

        //--------------------------------------------------------------------------------------------------
        // This method seeds BranchInventory rows (CurrentStock=0) for every product missing for a branch
        //--------------------------------------------------------------------------------------------------
        public int SeedBranchInventory(int branchCode)
        {
            SqlConnection con = null;
            SqlCommand cmd;

            try
            {
                con = connect("myProjDB");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

            Dictionary<string, object> paramDic = new Dictionary<string, object>();
            paramDic.Add("@BranchCode", branchCode);
            cmd = CreateCommandWithStoredProcedureGeneral("SP_BranchInventory_SeedForBranch", con, paramDic);

            try
            {
                int rowsAffected = Convert.ToInt32(cmd.ExecuteScalar());
                return rowsAffected;
            }
            catch (Exception ex)
            {
                throw (ex);
            }
            finally
            {
                if (con != null)
                {
                    con.Close();
                }
            }
        }
    }
}
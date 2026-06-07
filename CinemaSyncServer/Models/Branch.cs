using CinemaSyncServer.DAL;
using System;
using System.Collections.Generic;

namespace CinemaSyncServer.Models
{
    public class Branch
    {
        public int BranchCode { get; set; }
        public string BranchName { get; set; }
        public string City { get; set; }
        public int? MapiSiteId { get; set; }

        public Branch() { }

        public Branch(int branchCode, string branchName, string city, int? mapiSiteId)
        {
            this.BranchCode = branchCode;
            this.BranchName = branchName;
            this.City = city;
            this.MapiSiteId = mapiSiteId;
        }

        public static List<Branch> GetAll()
        {
            DBservices db = new DBservices();
            return db.GetAllBranches();
        }

        public static Branch GetById(int branchCode)
        {
            if (branchCode <= 0)
                throw new Exception("Invalid branch code");

            DBservices db = new DBservices();
            Branch branch = db.GetBranchById(branchCode);

            if (branch == null)
                throw new Exception("Branch not found");

            return branch;
        }

        public static bool Insert(Branch branch)
        {
            if (branch == null)
                throw new Exception("Branch data is missing");

            if (branch.BranchCode <= 0)
                throw new Exception("Branch code must be a positive number");

            if (string.IsNullOrWhiteSpace(branch.BranchName))
                throw new Exception("Branch name is required");

            if (string.IsNullOrWhiteSpace(branch.City))
                throw new Exception("City is required");

            DBservices db = new DBservices();
            int numEffected = db.InsertBranch(branch);

            if (numEffected == 0)
                throw new Exception("Branch was not inserted");

            return true;
        }

        public static bool Update(Branch branch)
        {
            if (branch == null)
                throw new Exception("Branch data is missing");

            if (branch.BranchCode <= 0)
                throw new Exception("Invalid branch code");

            if (string.IsNullOrWhiteSpace(branch.BranchName))
                throw new Exception("Branch name is required");

            if (string.IsNullOrWhiteSpace(branch.City))
                throw new Exception("City is required");

            DBservices db = new DBservices();
            int numEffected = db.UpdateBranch(branch);

            if (numEffected == 0)
                throw new Exception("Branch was not updated");

            return true;
        }

        public static bool Delete(int branchCode)
        {
            if (branchCode <= 0)
                throw new Exception("Invalid branch code");

            DBservices db = new DBservices();
            int numEffected = db.DeleteBranch(branchCode);

            if (numEffected == 0)
                throw new Exception("Branch was not deleted");

            return true;
        }
    }
}
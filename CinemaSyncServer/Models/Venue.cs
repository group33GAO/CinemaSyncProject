using CinemaSyncServer.DAL;
using System;
using System.Collections.Generic;

namespace CinemaSyncServer.Models
{
    public class Venue
    {
        public int VenueId { get; set; }
        public int BranchCode { get; set; }
        public string VenueName { get; set; }
        public int Capacity { get; set; }
        public string VenueType { get; set; }
        public bool Has3D { get; set; }
        public bool HasAtmos { get; set; }
        public bool IsActive { get; set; }

        public Venue() { }

        public static List<Venue> GetByBranch(int branchCode)
        {
            if (branchCode <= 0)
                throw new Exception("Invalid branch code");

            DBservices db = new DBservices();
            return db.GetVenuesByBranch(branchCode);
        }

        public static Venue GetById(int venueId)
        {
            if (venueId <= 0)
                throw new Exception("Invalid venue id");

            DBservices db = new DBservices();
            Venue v = db.GetVenueById(venueId);

            if (v == null)
                throw new Exception("Venue not found");

            return v;
        }
    }
}

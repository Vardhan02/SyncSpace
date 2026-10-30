"""
Export the synthetic datasets used for training to CSV so they can be inspected / shared.

Run (from the matching/ folder):  python export_datasets.py
Creates: roommate_students.csv, house_tenants.csv, house_listings.csv
"""
import pandas as pd
import train_two_tower as rm
import train_house_ranking as hr


def main():
    # ---- roommate dataset: 1,000 synthetic Cork students
    students = rm.generate_students(1000)
    students = students.rename(columns={"user_id": "student_id"})
    students["sleep_schedule"] = students["sleep_schedule"].map({0: "early bird", 1: "moderate", 2: "night owl"})
    students["social_habit"] = students["social_habit"].map({0: "homebody", 1: "balanced", 2: "social/party"})
    students["noise_tolerance"] = students["noise_tolerance"].map({0: "low", 1: "moderate", 2: "high"})
    students.to_csv("roommate_students.csv", index=False)

    # ---- house dataset: 1,000 tenants and 3,000 listings
    tenants = pd.DataFrame(hr.generate_tenants(hr.N_TENANTS))
    tenants.insert(0, "tenant_id", range(len(tenants)))
    tenants["areas"] = tenants["areas"].apply(lambda xs: "|".join(hr.AREAS[a] for a in xs))
    tenants["rooms"] = tenants["rooms"].apply(lambda xs: "|".join(hr.ROOMS[r] for r in xs))
    tenants.to_csv("house_tenants.csv", index=False)

    listings = pd.DataFrame(hr.generate_listings(hr.N_LISTINGS))
    listings.insert(0, "listing_id", range(len(listings)))
    listings["area"] = listings["area"].map(lambda a: hr.AREAS[a])
    listings["room"] = listings["room"].map(lambda r: hr.ROOMS[r])
    listings.to_csv("house_listings.csv", index=False)

    print(f"roommate_students.csv: {len(students)} rows")
    print(f"house_tenants.csv:     {len(tenants)} rows")
    print(f"house_listings.csv:    {len(listings)} rows")


if __name__ == "__main__":
    main()

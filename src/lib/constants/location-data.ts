export const locationData: Record<string, Record<string, string[]>> = {
  India: {
    Maharashtra: ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad"],
    Karnataka: ["Bangalore", "Mysore", "Hubli", "Mangalore"],
    Delhi: ["New Delhi", "Noida", "Gurgaon", "Faridabad"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Salem"],
    Gujarat: ["Ahmedabad", "Surat", "Vadodara", "Rajkot"],
    Telangana: ["Hyderabad", "Warangal", "Nizamabad"],
    "West Bengal": ["Kolkata", "Howrah", "Durgapur"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Agra", "Varanasi"],
    Rajasthan: ["Jaipur", "Jodhpur", "Udaipur", "Kota"],
    Kerala: ["Kochi", "Thiruvananthapuram", "Kozhikode"],
  },
  Nepal: {
    Bagmati: ["Kathmandu", "Lalitpur", "Bhaktapur"],
    Gandaki: ["Pokhara", "Gorkha"],
    Lumbini: ["Butwal", "Bhairahawa"],
  },
  Bangladesh: {
    Dhaka: ["Dhaka", "Gazipur", "Narayanganj"],
    Chittagong: ["Chittagong", "Comilla"],
    Rajshahi: ["Rajshahi", "Bogra"],
  },
  "Sri Lanka": {
    Western: ["Colombo", "Negombo", "Kalutara"],
    Central: ["Kandy", "Nuwara Eliya"],
    Southern: ["Galle", "Matara"],
  },
  Nigeria: {
    Lagos: ["Lagos", "Ikeja", "Lekki"],
    Abuja: ["Abuja", "Garki"],
    Rivers: ["Port Harcourt"],
  },
  Ghana: {
    "Greater Accra": ["Accra", "Tema"],
    Ashanti: ["Kumasi"],
  },
  Kenya: {
    Nairobi: ["Nairobi"],
    Mombasa: ["Mombasa"],
    Kisumu: ["Kisumu"],
  },
  UAE: {
    Dubai: ["Dubai"],
    "Abu Dhabi": ["Abu Dhabi"],
    Sharjah: ["Sharjah"],
  },
};

export const countries = Object.keys(locationData);

export function getStates(country: string): string[] {
  return Object.keys(locationData[country] ?? {});
}

export function getCities(country: string, state: string): string[] {
  return locationData[country]?.[state] ?? [];
}

export const countryCodes = [
  { value: "+91", label: "+91" },
  { value: "+1", label: "+1" },
  { value: "+44", label: "+44" },
  { value: "+971", label: "+971" },
  { value: "+61", label: "+61" },
  { value: "+65", label: "+65" },
];

export const counselorRanges = ["1 - 5", "6 - 10", "11 - 15", "16 - 25", "25+"];
export const volumeRanges = ["1 - 25", "26 - 50", "51 - 100", "101 - 250", "250+"];

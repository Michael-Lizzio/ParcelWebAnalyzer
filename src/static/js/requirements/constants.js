// static/js/requirements/constants.js

// Average speeds in mph for unit conversion
export const MODE_SPEEDS_MPH = {
  walk: 3,
  run: 6,
  bike: 12,
  drive: 30
};

// Return an emoji for each amenity
export function amenityEmoji(amenity) {
  switch (amenity) {
    // Food & drink
    case "restaurant":
    case "food_court":
      return "🍽️";
    case "fast_food":
      return "🍔";
    case "cafe":
      return "☕";
    case "bar":
      return "🍺";
    case "pub":
      return "🍻";
    case "ice_cream":
      return "🍨";
    case "bbq":
      return "🍖";

    // Grocery / supermarkets
    case "grocery_store":
      return "🛒";   // Updated emoji for grocery stores

    // Seating / street furniture
    case "bench":
      return "🪑";
    case "shelter":
      return "🛖";  // Shelter structure emoji

    // Waste & recycling
    case "waste_basket":
    case "waste_disposal":
      return "🗑️";
    case "recycling":
      return "♻️";

    // Water, toilets, hygiene
    case "drinking_water":
      return "🚰";
    case "toilets":
      return "🚻";
    case "shower":
      return "🚿";

    // Parking & vehicle services
    case "parking":
      return "🅿️";
    case "parking_space":
      return "🅿️";     // Parking space
    case "bicycle_parking":
      return "🚲";
    case "bicycle_rental":
      return "🚴";
    case "car_wash":
      return "🚗";
    case "loading_dock":
      return "🚚";
    case "compressed_air":
      return "💨";
    case "fuel":
      return "⛽";     // Gas station

    // Mail / packages / communication
    case "post_box":
      return "📮";
    case "post_office":
      return "🏤";
    case "parcel_locker":
      return "📦";
    case "telephone":
      return "☎️";
    case "storage":
      return "📦";

    // Education
    case "school":
      return "🏫";
    case "kindergarten":
      return "🏫";
    case "library":
      return "📚";

    // Health & care
    case "clinic":
    case "doctors":
      return "🩺";
    case "dentist":
      return "🦷";
    case "pharmacy":
      return "💊";
    case "veterinary":
      return "🐾";
    case "social_facility":
      return "🤝";      // Social facility
    case "animal_shelter":
      return "🐶";

    // Financial
    case "bank":
      return "🏦";
    case "atm":
      return "🏧";

    // Community / public spaces
    case "community_centre":
      return "🏠";
    case "public_bookcase":
      return "📚";
    case "events_venue":
      return "🎪";
    case "cinema":
      return "🎬";
    case "place_of_worship":
      return "⛪";
    case "ferry_terminal":
      return "⛴️";

    // Default
    default:
      return "•";
  }
}


// Turn amenity code into readable text
export function prettyAmenityName(amenity) {
  if (!amenity) return "Unknown";

  const overrides = {
    bbq: "BBQ",
    atm: "ATM",
    yes: "Amenity"
  };

  if (overrides[amenity]) return overrides[amenity];

  const parts = amenity.split("_");
  return parts
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

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

    // Parks & Recreation (leisure tags)
    case "park":
    case "landuse_park":
      return "🌳";
    case "playground":
      return "🛝";
    case "sports_centre":
    case "pitch":
    case "stadium":
    case "track":
      return "⚽";
    case "swimming_pool":
      return "🏊";
    case "fitness_centre":
    case "fitness_station":
      return "💪";
    case "dog_park":
      return "🐕";
    case "golf_course":
      return "⛳";
    case "garden":
      return "🌻";
    case "nature_reserve":
      return "🌲";
    case "marina":
      return "⛵";
    case "slipway":
      return "🚤";
    case "horse_riding":
      return "🐴";
    case "fishing":
      return "🎣";
    case "landuse_recreation_ground":
    case "landuse_village_green":
      return "🏞️";
    case "schoolyard":
      return "🏫";
    case "bleachers":
      return "🪑";
    case "outdoor_seating":
      return "🪑";
    case "picnic_table":
      return "🧺";
    case "firepit":
      return "🔥";
    case "bowling_alley":
      return "🎳";

    // Transit (public_transport, railway, highway=bus_stop)
    case "transit_stop_position":
    case "transit_platform":
    case "transit_bus_stop":
      return "🚏";
    case "transit_station":
    case "transit_rail":
    case "transit_tram_stop":
      return "🚉";
    case "bus_station":
      return "🚌";

    // Shops (shop_*)
    case "shop_bakery":
      return "🥖";
    case "shop_pharmacy":
    case "shop_chemist":
      return "💊";
    case "shop_clothes":
      return "👕";
    case "shop_books":
      return "📚";
    case "shop_electronics":
      return "💻";
    case "shop_furniture":
      return "🛋️";
    case "shop_florist":
      return "💐";
    case "shop_mall":
    case "shop_department_store":
      return "🏬";
    case "shop_bicycle":
      return "🚲";
    case "shop_hardware":
    case "shop_doityourself":
      return "🔨";
    case "shop_jewelry":
      return "💍";
    case "shop_shoes":
      return "👞";
    case "shop_toys":
      return "🧸";
    case "shop_pet":
    case "shop_pet_grooming":
      return "🐾";
    case "shop_butcher":
      return "🥩";
    case "shop_hairdresser":
    case "shop_beauty":
      return "💇";
    case "shop_wine":
    case "shop_alcohol":
      return "🍷";
    case "shop_cannabis":
      return "🌿";
    case "shop_art":
      return "🎨";
    case "shop_car_repair":
      return "🔧";
    case "shop_coffee":
      return "☕";
    case "shop_greengrocer":
      return "🥬";
    case "shop_pastry":
      return "🧁";
    case "shop_deli":
      return "🥪";

    // Tourism (tourism_*)
    case "tourism_museum":
      return "🏛️";
    case "tourism_hotel":
    case "tourism_motel":
      return "🏨";
    case "tourism_attraction":
      return "🎡";
    case "tourism_viewpoint":
      return "👁️";
    case "tourism_gallery":
      return "🖼️";
    case "tourism_artwork":
      return "🗿";
    case "tourism_picnic_site":
      return "🧺";
    case "tourism_information":
      return "ℹ️";

    // Healthcare (healthcare_*)
    case "healthcare_clinic":
    case "healthcare_doctor":
      return "🩺";
    case "healthcare_dentist":
      return "🦷";
    case "healthcare_pharmacy":
      return "💊";
    case "healthcare_hospital":
    case "hospital":
      return "🏥";
    case "healthcare_physiotherapist":
      return "💆";
    case "healthcare_optometrist":
      return "👓";
    case "healthcare_alternative":
      return "🌿";

    // Emergency (emergency_*)
    case "emergency_fire_station":
    case "fire_station":
      return "🚒";
    case "emergency_police":
    case "police":
      return "🚓";
    case "emergency_ambulance_station":
      return "🚑";
    case "emergency_defibrillator":
      return "❤️";
    case "emergency_fire_hydrant":
      return "🚰";

    // Historic (historic_*)
    case "historic_monument":
    case "historic_memorial":
      return "🗿";
    case "historic_ruins":
      return "🏛️";
    case "historic_castle":
      return "🏰";
    case "historic_building":
      return "🏛️";

    // Offices (office_*)
    case "office_government":
      return "🏛️";
    case "office_lawyer":
      return "⚖️";
    case "office_estate_agent":
      return "🏠";

    // Craft (craft_*)
    case "craft_brewery":
      return "🍺";
    case "craft_winery":
      return "🍷";

    // Arts & Entertainment
    case "nightclub":
      return "🕺";
    case "theatre":
      return "🎭";
    case "arts_centre":
      return "🎨";

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

// Approximate landmark centers for the manually assigned photo locations.
export const landmarks: Record<string, { latitude: number, longitude: number }> = {
  'Golden Gate Bridge': { latitude: 37.8199, longitude: -122.4783 },
  'Angel Island': { latitude: 37.86, longitude: -122.43 },
  'Mission Dolores Park': { latitude: 37.760, longitude: -122.427 },
  'Corona Heights Park': { latitude: 37.765, longitude: -122.439 },
  'Alamo Square': { latitude: 37.776, longitude: -122.434 },
  'Palace of Fine Arts': { latitude: 37.803, longitude: -122.448 },

  // Ann Arbor
  'University of Michigan Law Quadrangle': { latitude: 42.27414, longitude: -83.73933 },
  'Michigan Union': { latitude: 42.27523, longitude: -83.74123 },

  // Boston
  'Prudential Tower': { latitude: 42.34716, longitude: -71.08252 },
  'Longfellow Bridge': { latitude: 42.36163, longitude: -71.07541 },
  'International Place': { latitude: 42.35578, longitude: -71.05208 },
  'Fenway Park': { latitude: 42.34639, longitude: -71.09778 },
  'USS Constitution': { latitude: 42.3725, longitude: -71.0566 },
  'Duan Family Center for Computing & Data Sciences': { latitude: 42.3501, longitude: -71.1031 },

  // Chicago
  'Chicago Riverwalk': { latitude: 41.8883, longitude: -87.6218 },
  'Wrigley Building': { latitude: 41.88971, longitude: -87.62486 },
  'Grant Park': { latitude: 41.87583, longitude: -87.61889 },
  '875 North Michigan Avenue': { latitude: 41.8988, longitude: -87.623 },
  'Northwestern University Lagoon': { latitude: 42.054, longitude: -87.6719 },

  // Ephesus
  'Tetragonos Agora': { latitude: 37.93998, longitude: 27.34067 },
  'Library of Celsus': { latitude: 37.93914, longitude: 27.34075 },
  'Terrace Houses of Ephesus': { latitude: 37.93806, longitude: 27.34139 },
  'Domitian Square': { latitude: 37.93679, longitude: 27.34333 },

  // İzmir
  'Güvercinada': { latitude: 37.8635, longitude: 27.2478 },

  // Kraków
  'Church of Saints Peter and Paul': { latitude: 50.0569, longitude: 19.939 },
  'St. Andrew’s Church': { latitude: 50.05661, longitude: 19.93828 },
  'Cloth Hall': { latitude: 50.06167, longitude: 19.93722 },
  'Main Market Square': { latitude: 50.06203, longitude: 19.93773 },
  'Adam Mickiewicz Monument': { latitude: 50.06139, longitude: 19.93778 },
  'Grunwald Monument': { latitude: 50.06642, longitude: 19.94214 },
  'Grunwald Bridge': { latitude: 50.04972, longitude: 19.93444 },
  'Wawel Hill': { latitude: 50.0525, longitude: 19.935 },
  'Wawel Cathedral': { latitude: 50.0546, longitude: 19.9354 },

  // Kutná Hora
  'Kutná Hora-Sedlec station': { latitude: 49.95768, longitude: 15.29038 },
  'Church of Our Lady Na Náměti': { latitude: 49.95012, longitude: 15.27313 },
  'Italian Court': { latitude: 49.94833, longitude: 15.26861 },
  'Jesuit College': { latitude: 49.94611, longitude: 15.26389 },
  'Plague Column': { latitude: 49.9494, longitude: 15.2669 },
  'Gothic Stone Fountain': { latitude: 49.9488, longitude: 15.2639 },
  'St. Barbara’s Cathedral': { latitude: 49.945, longitude: 15.26361 },
  'Church of St. James': { latitude: 49.9483, longitude: 15.2676 },

  // New York City
  'One World Trade Center': { latitude: 40.71306, longitude: -74.01333 },
  'The Oculus': { latitude: 40.7115, longitude: -74.0114 },
  'Times Square': { latitude: 40.7575, longitude: -73.9858 },
  'Manhattan Bridge': { latitude: 40.707, longitude: -73.9905 },
  'Brooklyn Bridge': { latitude: 40.7057, longitude: -73.9964 },
  'Grand Central Terminal': { latitude: 40.7528, longitude: -73.9772 },
  'Yankee Stadium': { latitude: 40.82917, longitude: -73.92639 },
  'Statue of Liberty': { latitude: 40.68917, longitude: -74.04444 },
  '9/11 Memorial': { latitude: 40.71167, longitude: -74.01361 },
  'Intrepid Museum': { latitude: 40.7646, longitude: -73.9996 },
  'Citi Field': { latitude: 40.75694, longitude: -73.84583 },
  'Pepsi-Cola Sign': { latitude: 40.7475, longitude: -73.95778 },
  'United Nations Headquarters': { latitude: 40.74944, longitude: -73.96806 },

  // Prague
  'National Theatre': { latitude: 50.08111, longitude: 14.41361 },
  'Yellow Penguins at Museum Kampa': { latitude: 50.08418, longitude: 14.40899 },
  'Leopold Gate': { latitude: 50.06315, longitude: 14.42177 },
  'Vyšehrad': { latitude: 50.06417, longitude: 14.41944 },
  'Basilica of Sts. Peter and Paul': { latitude: 50.06436, longitude: 14.41779 },
  'Vyšehrad Railway Bridge': { latitude: 50.06689, longitude: 14.41339 },
  'Hvězda Summer Palace': { latitude: 50.0834, longitude: 14.3263 },
  'Charles Bridge': { latitude: 50.08639, longitude: 14.41194 },
  'Powder Gate': { latitude: 50.0872, longitude: 14.4278 },
  'National Monument at Vítkov': { latitude: 50.08872, longitude: 14.44998 },
  'National Museum': { latitude: 50.07883, longitude: 14.4308 },

  // San Francisco
  'Castro Theatre': { latitude: 37.762, longitude: -122.435 },
  'Letterman Digital Arts Center': { latitude: 37.79981, longitude: -122.44926 },
  'Crissy Field': { latitude: 37.8042, longitude: -122.4597 },
  'Alcatraz Island': { latitude: 37.82667, longitude: -122.42278 },
  'Pigeon Point Lighthouse': { latitude: 37.18175, longitude: -122.39392 },
  'Ocean Beach': { latitude: 37.75944, longitude: -122.51083 },
  'San Francisco Ferry Building': { latitude: 37.7955, longitude: -122.3937 },

  // Vancouver
  'Vancouver Convention Centre West': { latitude: 49.28917, longitude: -123.1138 },
  'Canada Place': { latitude: 49.28863, longitude: -123.11112 },
  'Digital Orca': { latitude: 49.28977, longitude: -123.11679 },
  'Vancouver Art Gallery': { latitude: 49.28287, longitude: -123.12046 },
  'One Wall Centre': { latitude: 49.28046, longitude: -123.127 },

  // Zakopane
  'Giewont': { latitude: 49.25056, longitude: 19.93389 },
  'Siklawica Waterfall': { latitude: 49.25944, longitude: 19.92889 },
  'Polana Strążyska': { latitude: 49.26278, longitude: 19.92972 },
  'Strążyska Valley': { latitude: 49.27028, longitude: 19.9325 },
}

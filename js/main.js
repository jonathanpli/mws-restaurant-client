let restaurants,
  neighborhoods,
  cuisines;

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
};

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
};

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');
  
  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
    center: [40.722216, -73.987501],
    zoom: 12,
    scrollWheelZoom: false
  });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoiamxpMjI3IiwiYSI6ImNpZnhvMW55MDRkMHd1dW0wbHVsZjQ2c20ifQ.er_enUpQ3bD_cEsYEpuPmw',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/" aria-label="Hyperlink to Open Street Map">OpenStreetMap</a> contributors, ' +
    '<a href="https://creativecommons.org/licenses/by-sa/2.0/" aria-label="Hyperlink to Creative Commons License">CC-BY-SA</a>, ' +
    'Imagery © <a href="https://www.mapbox.com/" aria-label="Hyperlink to Mapbox">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(self.newMap);
  
  updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');
  
  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;
  
  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;
  
  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';
  
  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  
  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = `Restaurant Image for ${restaurant.name}`;
  image.title = restaurant.name;
  li.append(image);
  
  const name = document.createElement('h2');
  name.classList.add('restaurant-names');
  name.innerHTML = restaurant.name;
  li.append(name);
  
  const neighborhood = document.createElement('p');
  neighborhood.classList.add('neighborhood');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);
  
  const address = document.createElement('p');
  
  const address1 = document.createElement('span');
  const splitIndex = restaurant.address.indexOf(',');
  address1.innerHTML = restaurant.address.substring(0, splitIndex);
  address.append(address1);
  
  const address2 = document.createElement('span');
  address2.innerHTML = restaurant.address.substring(splitIndex);
  address2.classList.add('address-line-2');
  address.append(address2);
  
  li.append(address);
  
  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  more.role = 'button';
  more.setAttribute('aria-label', `View details for ${restaurant.name}`);
  li.append(more);
  
  return li;
};

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    
    self.markers.push(marker);
  });
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../sw.js', {scope: '/'}).then(registration => {
      // registration success!
    }, err => {
      // registration failed!
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

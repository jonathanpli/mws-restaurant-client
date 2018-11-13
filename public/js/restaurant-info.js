'use strict';

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', async(event) => {
  await DBHelper.init();
  await initMap();
});

/**
 * Initialize leaflet map
 */
const initMap = async() => {
  let restaurant = await fetchRestaurantFromURL();
  if (restaurant) {
    if (!self.newMap) {
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
        scrollWheelZoom: false
      });
    }
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
      mapboxToken: 'pk.eyJ1IjoiamxpMjI3IiwiYSI6ImNpZnhvMW55MDRkMHd1dW0wbHVsZjQ2c20ifQ.er_enUpQ3bD_cEsYEpuPmw',
      maxZoom: 18,
      attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox.streets'
    }).addTo(newMap);
    await fillBreadcrumb(restaurant);
    DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
  } else {
    // Restaurant either doesn't exist or there was a connection error
    console.error('Error fetching restaurant');
  }
};

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = async() => {
  if (self.restaurant) { // restaurant already fetched!
    return self.restaurant;
  }
  
  const id = getParameterByName('id');
  if (!id) {
    return null;
  } else {
    let restaurant = await DBHelper.fetchRestaurantById(id);
    self.restaurant = restaurant;
    await fillRestaurantHTML(restaurant);
    return restaurant;
  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = async(restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;
  
  const isFavorite = document.getElementById('is-favorite');
  isFavorite.innerHTML = restaurant.is_favorite ? '&#x2665;' : '&#x2661;';
  isFavorite.setAttribute('aria-label', restaurant.is_favorite ? 'Remove as Favorite' : 'Add as Favorite');
  
  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;
  
  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = `Restaurant Image for ${restaurant.name}`;
  image.title = restaurant.name;
  
  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;
  
  // fill operating hours
  if (restaurant.operating_hours) {
    await fillRestaurantHoursHTML();
  }
  // fill reviews
  await fillReviewsHTML();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = async(operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');
    
    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);
    
    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);
    
    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = async(reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h3');
  title.innerHTML = 'Reviews';
  container.appendChild(title);
  
  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(async(review) => {
    ul.appendChild(await createReviewHTML(review));
  });
  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = async(review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);
  
  const date = document.createElement('p');
  if (review.date) {
    date.innerHTML = review.date;
  }
  li.appendChild(date);
  
  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);
  
  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);
  
  return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = async(restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute('aria-current', 'page');
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url = window.location.search) => {
  let urlParams = new URLSearchParams(url);
  return urlParams.get(name);
};

const toggleFavorite = async() => {
  const storeKey = 'restaurants';
  let id = getParameterByName('id');
  let restaurant = await DBHelper.fetchRestaurantById(id);
  await DBHelper.toggleRestaurantFavorite(restaurant);
  
  const isFavorite = document.getElementById('is-favorite');
  isFavorite.innerHTML = restaurant.is_favorite ? '&#x2665;' : '&#x2661;';
  isFavorite.setAttribute('aria-label', restaurant.is_favorite ? 'Remove as Favorite' : 'Add as Favorite');
  
  await dbPromise.then(async(db) => {
    const tx = db.transaction(storeKey, 'readwrite');
    tx.objectStore(storeKey).put(restaurant);
  });
};

const addReview = () => {
  const form = document.getElementById("review-form");
  const review = {
    restaurant_id: getParameterByName('id'),
    name: form.elements.namedItem('review-name').value,
    rating: form.elements.namedItem('review-rating').value,
    comments: form.elements.namedItem('review-content').value
  };
  
  DBHelper.saveReview(review).then(() => {
    form.reset();
    window.location.reload();
  }).catch(err => {
    console.error("Error saving review", err);
    
  });
};

if ('serviceWorker' in navigator && 'SyncManager' in window) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../sw.js', {scope: '/'}).then(async reg => {
      await navigator.serviceWorker.ready;
      return reg.sync.register('initialSync');
    }, err => {
      // registration failed!
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
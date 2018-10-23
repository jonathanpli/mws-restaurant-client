/**
 * Common database helper functions.
 */
class DBHelper {
  
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }
  
  static _isEqual(obj1, obj2) {
    if (!obj1 || !obj2) {
      return false;
    }
    let keyset1 = Object.keys(obj1);
    let keyset2 = Object.keys(obj2);
    if (keyset1.length !== keyset2.length) {
      return false;
    }
    for (let key of keyset1) {
      let areObjs = (obj1[key] !== null && typeof obj1[key] === 'object') &&
        (obj2[key] !== null && typeof obj2[key] === 'object');
      if (areObjs && !DBHelper._isEqual(obj1[key], obj2[key])) {
        return false;
      } else if (!areObjs && obj1[key] !== obj2[key]) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Fetch all restaurants.
   */
  static async fetchRestaurants(callback) {

    fetch(DBHelper.DATABASE_URL).then(async(response) => {
      if (response.status !== 200) {
        const error = (`Request failed. Returned status of ${response.status}`);
        await callback(error, null);
        throw new Error('Failed to get restaurants from server');
      } else {
        return response.json();
      }
    }).then(async(restaurants) => {
      dbPromise.then(async(db) => {
        const tx = db.transaction(storeKey, 'readwrite');
        for (let restaurant of restaurants) {
          if (!DBHelper._isEqual(await IDBWrapper.getRestaurants(restaurant.id, tx), restaurant)) {
            tx.objectStore(storeKey).put(restaurant);
          }
        }
        let completed = tx.complete;
        await callback(null, restaurants);
        return completed;
      });
    }).catch(async (err) => {
      console.error('Error:', err);
      await dbPromise.then(async() => {
        let restaurants = await IDBWrapper.getRestaurants();
        await callback(null, restaurants);
      });
    });
  }
  
  /**
   * Fetch a restaurant by its ID.
   */
  static async fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    await DBHelper.fetchRestaurants(async(error, restaurants) => {
      if (error) {
        await callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          await callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          await callback('Restaurant does not exist', null);
        }
      }
    });
  }
  
  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static async fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    await DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }
  
  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static async fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    await DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }
  
  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static async fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    await DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }
  
  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static async fetchNeighborhoods(callback) {
    // Fetch all restaurants
    await DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }
  
  /**
   * Fetch all cuisines with proper error handling.
   */
  static async fetchCuisines(callback) {
    // Fetch all restaurants
    await DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        callback(null, uniqueCuisines);
      }
    });
  }
  
  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }
  
  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}`);
  }
  
  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      });
    marker.addTo(map);
    return marker;
  }
}


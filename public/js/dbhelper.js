/**
 * Common database helper functions.
 */
class DBHelper {
  
  constructor() {
    this.databaseUrl = 'http://localhost:1337';
  }
  
  async init() {
    this.restaurants = await this.fetchRestaurants();
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
      if ((areObjs && !DBHelper._isEqual(obj1[key], obj2[key])) || (!areObjs && obj1[key] !== obj2[key])) {
        return false;
      }
    }
    return true;
  }
  
  /**
   * Fetch all restaurants.
   */
  async fetchRestaurants() {
    return await fetch(`${this.databaseUrl}/restaurants`).then(response => {
      if (response.status !== 200) {
        throw new Error('Failed to fetch restaurants from server');
      }
      return response.json();
    }).then(restaurants => {
      this.restaurants = restaurants;
      
      return dbPromise.then(async(db) => {
        const tx = db.transaction(storeKey, 'readwrite');
        for (let restaurant of restaurants) {
          if (!DBHelper._isEqual(await IDBWrapper.getRestaurants(restaurant.id, tx), restaurant)) {
            tx.objectStore(storeKey).put(restaurant);
          }
        }
        return restaurants;
      });
    }).catch(async(err) => {
      console.error('Loading from IndexedDB since there was an error:', err);
      await dbPromise.then(async() => {
        return await IDBWrapper.getRestaurants();
      });
    });
  }
  
  /**
   * Fetch a restaurant by its ID.
   */
  async fetchRestaurantById(id) {
    if (!this.restaurants) {
      this.restaurants = await this.fetchRestaurants();
    }
    return this.restaurants.find(restaurant => restaurant.id === Number.parseInt(id));
  }
  
  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  async fetchRestaurantsByCuisineAndNeighborhood(cuisine, neighborhood) {
    return this.restaurants.filter(restaurant => {
      return (cuisine === 'all' || restaurant.cuisine_type === cuisine) && (neighborhood === 'all' || restaurant.neighborhood === neighborhood);
    });
  }
  
  /**
   * Fetch all neighborhoods with proper error handling.
   */
  async fetchNeighborhoods() {
    return this.restaurants.map(restaurant => restaurant.neighborhood);
  }
  
  /**
   * Fetch all cuisines with proper error handling.
   */
  async fetchCuisines() {
    return this.restaurants.map(restaurant => restaurant.cuisine_type);
  }
  
  async toggleRestaurantFavorite(id) {
    let restaurant = await this.fetchRestaurantById(id);
    restaurant.is_favorite = !restaurant.is_favorite;
    await fetch(`${this.databaseUrl}/restaurants/${id}?is_favorite=${restaurant.is_favorite}`, {
      method: 'PUT'
    });
    return restaurant;
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
    return (`/img/${restaurant.photograph}.jpg`);
  }
}

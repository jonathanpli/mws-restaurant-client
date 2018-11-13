/**
 * Common database helper functions.
 */

class DBHelper {
  
  static async init() {
    DBHelper.databaseUrl = 'http://localhost:1337';
    DBHelper.restaurants = await DBHelper.fetchRestaurants();
    
    let reviews = await DBHelper.fetchReviews();
    if (reviews) {
      for (let restaurant of DBHelper.restaurants) {
        restaurant.reviews = reviews.filter(review => review.restaurant_id === restaurant.id);
      }
    }
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
  
  static async fetchReviews() {
    const storeKey = 'reviews';
    return fetch(`${DBHelper.databaseUrl}/reviews`, {method: 'GET'}).then(async response => {
      let reviews = await response.json();
      if (response.status !== 200 && response.status !== 201) {
        throw new Error('Failed to fetch reviews from server');
      }
      return reviews;
    }).then(reviews => {
      return dbPromise.then(async(db) => {
        const tx = db.transaction(storeKey, 'readwrite');
        for (let review of reviews) {
          delete review.outOfSync;
          if (!DBHelper._isEqual(await IDBWrapper.getReviews(review.id, tx), review)) {
            tx.objectStore(storeKey).put(review);
          }
        }
        return IDBWrapper.getReviews();
      });
    }).catch(async(err) => {
      console.error('Loading from IndexedDB since there was an error:', err);
      return dbPromise.then(() => {
        return IDBWrapper.getReviews();
      });
    });
  }
  
  /**
   * Fetch all restaurants.
   */
  static async fetchRestaurants() {
    const storeKey = 'restaurants';
    return await fetch(`${DBHelper.databaseUrl}/restaurants`).then(response => {
      if (response.status !== 200) {
        throw new Error('Failed to fetch restaurants from server');
      }
      return response.json();
    }).then(restaurants => {
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
  static async fetchRestaurantById(id) {
    if (!DBHelper.restaurants) {
      DBHelper.restaurants = await DBHelper.fetchRestaurants();
    }
    return DBHelper.restaurants.find(restaurant => restaurant.id === Number.parseInt(id));
  }
  
  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static async fetchRestaurantsByCuisineAndNeighborhood(cuisine, neighborhood) {
    return DBHelper.restaurants.filter(restaurant => {
      return (cuisine === 'all' || restaurant.cuisine_type === cuisine) && (neighborhood === 'all' || restaurant.neighborhood === neighborhood);
    });
  }
  
  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static async fetchNeighborhoods() {
    return DBHelper.restaurants.map(restaurant => restaurant.neighborhood);
  }
  
  /**
   * Fetch all cuisines with proper error handling.
   */
  static async fetchCuisines() {
    return DBHelper.restaurants.map(restaurant => restaurant.cuisine_type);
  }
  
  static async toggleRestaurantFavorite(restaurant) {
    restaurant.is_favorite = !restaurant.is_favorite;
    restaurant.updatedAt = new Date().toISOString();
    await fetch(`${DBHelper.databaseUrl}/restaurants/${restaurant.id}?is_favorite=${restaurant.is_favorite}`, {
      method: 'PUT'
    });
    return restaurant;
  }
  
  static async saveReview(review) {
    const key = 'reviews';
    review.restaurant_id = Number.parseInt(review.restaurant_id);
    review.rating = Number.parseInt(review.rating);
    // Add to IDB
    const reviewId = await IDBWrapper.saveElement(key, review, true);
    return fetch(`${DBHelper.databaseUrl}/reviews`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(review)
    }).then(res => {
      if (res.status === 201) {
        review.id = reviewId;
        return IDBWrapper.saveElement(key, review, false);
      }
    });
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

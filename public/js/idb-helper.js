const dbPromise = idb.open('restaurant-reviews-store', 1, upgradeDb => {
  switch (upgradeDb.oldVersion) {
    case 0:
      upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
      upgradeDb.createObjectStore('reviews', {keyPath: 'id'});
  }
});

class IDBWrapper {
  static async getRestaurants(id, transaction) {
    const storeKey = 'restaurants';
    if (!id) {
      return dbPromise.then(db => db.transaction(storeKey)
        .objectStore(storeKey).getAll());
    } else {
      return transaction.objectStore(storeKey).get(id);
    }
  }
  
  static async getReviews(id, transaction) {
    const storeKey = 'reviews';
    if (!id) {
      return dbPromise.then(db => db.transaction(storeKey)
        .objectStore(storeKey).getAll());
    } else {
      return transaction.objectStore(storeKey).get(id);
    }
  }
  
  static async saveElementAsSynced(type, element) {
    element.synced = true;
    return dbPromise.then(db => db.transaction(type, 'readwrite')
      .objectStore(type).put(element));
  }
  
  static async sync(key) {
    let elements = await dbPromise.then(db => db.transaction(key)
      .objectStore(key).getAll());
    let fn = key === "restaurants" ? DBHelper.toggleRestaurantFavorite : DBHelper.saveReview;
    for (let element of elements) {
      delete element.synced;
      fn.call(null, element)
        .then(async() => {
          // success
          await IDBWrapper.saveElementAsSynced(key, element);
        }).catch(async(err) => {
          // failure
          console.error('Error updating database');
        });
    }
  }
}

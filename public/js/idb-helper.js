const dbPromise = idb.open('restaurant-reviews-store', 1, upgradeDb => {
  switch (upgradeDb.oldVersion) {
    case 0:
      upgradeDb.createObjectStore('restaurants', {keyPath: 'id'});
      upgradeDb.createObjectStore('reviews', {keyPath: 'id', autoIncrement: true});
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
  
  static async saveElement(type, element, outOfSync) {
    let newElement = Object.assign({}, element);
    if (outOfSync) {
      newElement.outOfSync = outOfSync;
    } else {
      delete newElement.outOfSync;
    }
    return dbPromise.then(db => {
      return db.transaction(type, 'readwrite').objectStore(type).put(newElement);
    });
  }
  
  static async sync() {
    let allKeys = {
      restaurants: 'toggleRestaurantFavorite',
      reviews: 'saveReview'
    };
    Object.keys(allKeys).forEach(async (key) => {
      let elements = (await dbPromise.then(db => db.transaction(key)
        .objectStore(key).getAll())).filter(element => element.outOfSync);
      console.log("elements are ", elements);
      
      let fn = DBHelper[allKeys[key]];
      for (let element of elements) {
        const {outOfSync, ...payload} = element;
        console.log("The payload is ", payload);
        await fn(payload).catch(async(err) => {
          // failure
          console.error('Error updating database', err);
        });
      }
    });
  }
}

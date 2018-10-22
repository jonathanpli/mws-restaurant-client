const storeKey = 'restaurants';

const dbPromise = idb.open('restaurant-reviews-store', 1, upgradeDb => {
  switch (upgradeDb.oldVersion) {
    case 0:
      upgradeDb.createObjectStore(storeKey, {keyPath: 'id'});
  }
});

class IDBWrapper {
  static async getRestaurants(id, transaction) {
    if (!id) {
      return dbPromise.then(db => db.transaction(storeKey)
        .objectStore(storeKey).getAll());
    } else {
      return transaction.objectStore(storeKey).get(id);
    }
  }
}

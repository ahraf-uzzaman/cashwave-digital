const firebaseConfig = {
    apiKey: "AIzaSyAL8gcEl_2wEyLr_DwqmcrwM2XLcCpb3tk",
    authDomain: "cashwave-digital-c04ad.firebaseapp.com",
    projectId: "cashwave-digital-c04ad",
    storageBucket: "cashwave-digital-c04ad.firebasestorage.app",
    messagingSenderId: "810347205072",
    appId: "1:810347205072:web:9a8a6adc2ec16df35ae9d5"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

db.enablePersistence()
  .catch((err) => {
      console.log("Firebase persistence error: ", err.code);
  });
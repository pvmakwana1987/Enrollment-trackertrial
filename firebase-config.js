const firebaseConfig = {
  apiKey: "AIzaSyCHJKvQt9eVZyk6tkfjYXS1Dwv-ESCJT-Q",
  authDomain: "claudeenrollment.firebaseapp.com",
  databaseURL: "https://claudeenrollment-default-rtdb.firebaseio.com",
  projectId: "claudeenrollment",
  storageBucket: "claudeenrollment.firebasestorage.app",
  messagingSenderId: "712817787650",
  appId: "1:712817787650:web:a226c4edf5190b7ed8b81b"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
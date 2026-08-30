import 'bootstrap/dist/css/bootstrap.min.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import PrimeVue from 'primevue/config'
import Aura from '@primevue/themes/aura'

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDB91cBXRJo7uU63YQwpDQ2xeWryS2v3BI",
  authDomain: "fit5032-wk7-76952.firebaseapp.com",
  projectId: "fit5032-wk7-76952",
  storageBucket: "fit5032-wk7-76952.firebasestorage.app",
  messagingSenderId: "643662675312",
  appId: "1:643662675312:web:d500b0f466cf8098ea23b5"
};

// Initialize Firebase
initializeApp(firebaseConfig);

const app = createApp(App)
app.use(PrimeVue, { theme: { preset: Aura } })
app.use(router)

app.mount('#app')

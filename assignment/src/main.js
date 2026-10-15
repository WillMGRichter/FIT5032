import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useAccessibilityStore } from './stores/accessibilityStore'
import './assets/main.css'

useAccessibilityStore().init()

createApp(App).use(router).mount('#app')

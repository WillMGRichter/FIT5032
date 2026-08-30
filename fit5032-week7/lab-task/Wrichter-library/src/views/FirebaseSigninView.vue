<template>
    <h1>Sign in</h1>
    <p><input type="email" placeholder="Email" v-model="email" /></p>
    <p><input type="password" placeholder="Password" v-model="password" /></p>
    <p><button @click="signin">Sign in via Firebase</button></p>
</template>

<script setup>
import { ref } from 'vue'
import { getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { useRouter } from 'vue-router'

const email = ref('')
const password = ref('')
const router = useRouter()
const auth = getAuth()

const signin = async () => {
    signInWithEmailAndPassword(auth, email.value, password.value)
    .then((data) => {
        console.log('Firebase Sign-in Successful!')
        router.push('/')
        console.log(auth.currentUser)
    })
    .catch((error) => {
        console.log(error.code)
    })
};
</script>
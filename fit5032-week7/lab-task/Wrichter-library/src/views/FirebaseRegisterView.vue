<template>
    <h1>Create an Account</h1>
    <p><input type="email" placeholder="Email" v-model="email" /></p>
    <p><input type="password" placeholder="Password" v-model="password" /></p>
    <button @click="register">Save to Firebase</button>
</template>

<script setup>
import { ref } from 'vue'
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"
import {useRouter} from 'vue-router'

const email = ref('')
const password = ref('')
const router = useRouter()
const auth = getAuth()

const register = async () => {
    createUserWithEmailAndPassword(auth, email.value, password.value)
    .then((data) => {
        console.log('Firebase Register Successful!')
        router.push('/FireLogin')
    }).catch((error) => {
        console.log(error.code)
    })
};
</script>
require('dotenv').config()
const express = require('express')
const cors = require('cors')

const projectRoutes = require('./routes/projectRoutes')
const categoryRoutes = require('./routes/categoryRoutes')
const plantRoutes = require('./routes/plantRoutes')
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/projects', projectRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/plants', plantRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app

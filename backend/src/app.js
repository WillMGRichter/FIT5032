require('dotenv').config()
const express = require('express')
const cors = require('cors')

const projectRoutes = require('./routes/projectRoutes')
const categoryRoutes = require('./routes/categoryRoutes')
const plantRoutes = require('./routes/plantRoutes')
const authRoutes = require('./routes/authRoutes')
const adminRoutes = require('./routes/adminRoutes')
const ratingRoutes = require('./routes/ratingRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const emailRoutes = require('./routes/emailRoutes')
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler')
const { attachUser } = require('./middleware/auth')

const app = express()

const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || clientOrigins.includes(origin)) return callback(null, true)
      return callback(null, false)
    },
    credentials: true,
  })
)
app.use(express.json())
app.use(attachUser)

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/projects', projectRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/plants', plantRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/projects/:id/ratings', ratingRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/email', emailRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app

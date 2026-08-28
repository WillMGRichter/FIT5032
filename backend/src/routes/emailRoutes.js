const router = require('express').Router()
const multer = require('multer')
const controller = require('../controllers/emailController')
const { requireAuth } = require('../middleware/auth')

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'text/plain',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Attachment type is not allowed.'))
    }
  },
})

router.post(
  '/projects/:id/send',
  requireAuth,
  upload.array('attachments', 5),
  controller.sendProjectEmail,
)

router.get('/projects/:id/participants', requireAuth, controller.getProjectParticipantsEndpoint)

module.exports = router

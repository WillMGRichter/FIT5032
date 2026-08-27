<script setup>
import { ref, computed, watch } from 'vue'
import FormInput from '@/components/forms/FormInput.vue'
import FormTextarea from '@/components/forms/FormTextarea.vue'
import FormError from '@/components/forms/FormError.vue'
import AppIcon from '@/components/common/AppIcon.vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  recipients: { type: Array, default: () => [] },
  recipientLabel: { type: String, default: 'All users' },
  projectTitle: { type: String, default: '' },
})

const emit = defineEmits(['close', 'sent'])

const subject = ref('')
const message = ref('')
const attachment = ref(null)
const attachmentName = ref('')
const isSending = ref(false)
const sendError = ref(null)
const sendSuccess = ref(false)
const errors = ref({})

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.txt', '.csv', '.doc', '.docx', '.xls', '.xlsx']

const recipientCount = computed(() => props.recipients.length)

const canSend = computed(
  () => subject.value.trim() && message.value.trim() && recipientCount.value > 0 && !isSending.value,
)

watch(
  () => props.visible,
  (open) => {
    if (open) {
      resetForm()
    }
  },
)

function resetForm() {
  subject.value = props.projectTitle ? `Update for "${props.projectTitle}"` : ''
  message.value = ''
  attachment.value = null
  attachmentName.value = ''
  sendError.value = null
  sendSuccess.value = false
  errors.value = {}
}

function validate() {
  const errs = {}
  if (!subject.value.trim()) {
    errs.subject = 'Subject is required.'
  } else if (subject.value.trim().length > 200) {
    errs.subject = 'Subject must be 200 characters or fewer.'
  }
  if (!message.value.trim()) {
    errs.message = 'Message is required.'
  } else if (message.value.trim().length > 5000) {
    errs.message = 'Message must be 5000 characters or fewer.'
  }
  if (attachment.value) {
    if (attachment.value.size > MAX_ATTACHMENT_BYTES) {
      errs.attachment = 'Attachment must be 10 MB or smaller.'
    }
    const ext = '.' + attachment.value.name.split('.').pop().toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      errs.attachment = 'Attachment type is not allowed.'
    }
  }
  errors.value = errs
  return Object.keys(errs).length === 0
}

function handleAttachmentChange(event) {
  const file = event.target.files?.[0]
  if (file) {
    attachment.value = file
    attachmentName.value = file.name
    if (errors.value.attachment) {
      delete errors.value.attachment
    }
  }
}

function removeAttachment() {
  attachment.value = null
  attachmentName.value = ''
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function handleClose() {
  emit('close')
}

async function handleSend() {
  if (!validate()) return

  isSending.value = true
  sendError.value = null
  sendSuccess.value = false

  try {
    const payload = {
      recipients: props.recipients.map((r) => ({ email: r.email })),
      subject: subject.value.trim(),
      message: message.value.trim(),
      attachments: attachment.value ? [attachment.value] : [],
    }

    const { sendEmail: apiSend, sendProjectEmail } = await import('@/services/emailService.js')

    if (props.projectTitle) {
      const projectId = props.recipients[0]?.projectId
      if (projectId) {
        await sendProjectEmail(projectId, payload)
      } else {
        await apiSend(payload)
      }
    } else {
      await apiSend(payload)
    }

    sendSuccess.value = true
    emit('sent')
  } catch (err) {
    sendError.value =
      err && err.message ? err.message : 'Could not send email. Please try again.'
  } finally {
    isSending.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-overlay" @click.self="handleClose">
      <div class="modal" role="dialog" aria-labelledby="email-modal-title">
        <header class="modal__header">
          <h2 id="email-modal-title">Send Email</h2>
          <button type="button" class="modal__close" aria-label="Close" @click="handleClose">
            <AppIcon name="close" :size="20" />
          </button>
        </header>

        <div class="modal__body">
          <div v-if="sendSuccess" class="modal__success">
            <AppIcon name="check" :size="24" />
            <p>Email sent successfully to {{ recipientCount }} recipient{{ recipientCount === 1 ? '' : 's' }}.</p>
            <button type="button" class="modal__button" @click="handleClose">Close</button>
          </div>

          <template v-else>
            <div class="modal__recipients">
              <span class="modal__recipients-label">To:</span>
              <span class="modal__recipients-value">
                {{ recipientLabel }}
                <span class="modal__recipients-count">({{ recipientCount }} recipient{{ recipientCount === 1 ? '' : 's' }})</span>
              </span>
            </div>

            <FormInput
              id="email-subject"
              v-model="subject"
              label="Subject"
              :error="errors.subject"
              placeholder="Enter email subject"
              required
            />

            <FormTextarea
              id="email-message"
              v-model="message"
              label="Message"
              :error="errors.message"
              placeholder="Type your message here..."
              :rows="8"
              required
            />

            <div class="modal__attachment">
              <label class="modal__attachment-label">
                Attachment (optional, max 10 MB)
              </label>
              <div v-if="attachmentName" class="modal__attachment-file">
                <span class="modal__attachment-name">{{ attachmentName }}</span>
                <span class="modal__attachment-size">{{ formatFileSize(attachment.value?.size || 0) }}</span>
                <button type="button" class="modal__attachment-remove" @click="removeAttachment">
                  <AppIcon name="trash" :size="16" />
                </button>
              </div>
              <label v-else class="modal__attachment-drop">
                <AppIcon name="feather" :size="20" />
                <span>Choose a file to attach</span>
                <input
                  type="file"
                  class="modal__attachment-input"
                  :accept="ALLOWED_EXTENSIONS.join(',')"
                  @change="handleAttachmentChange"
                />
              </label>
              <FormError :message="errors.attachment" />
            </div>

            <div v-if="sendError" role="alert" class="modal__error">
              {{ sendError }}
            </div>
          </template>
        </div>

        <footer v-if="!sendSuccess" class="modal__footer">
          <button type="button" class="modal__button modal__button--secondary" @click="handleClose">
            Cancel
          </button>
          <button
            type="button"
            class="modal__button modal__button--primary"
            :disabled="!canSend"
            @click="handleSend"
          >
            <template v-if="isSending">Sending…</template>
            <template v-else>
              <AppIcon name="send" :size="16" />
              Send Email
            </template>
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  background-color: rgba(0, 0, 0, 0.5);
}

.modal {
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md) var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal__header h2 {
  margin: 0;
  font-size: var(--font-size-lg);
}

.modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xs);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.modal__close:hover {
  color: var(--color-text);
}

.modal__body {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.modal__recipients {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-background);
  font-size: var(--font-size-sm);
}

.modal__recipients-label {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-secondary);
}

.modal__recipients-value {
  font-weight: var(--font-weight-medium);
}

.modal__recipients-count {
  color: var(--color-text-secondary);
  font-weight: var(--font-weight-normal);
}

.modal__attachment {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.modal__attachment-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.modal__attachment-drop {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: border-color 0.15s;
}

.modal__attachment-drop:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.modal__attachment-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}

.modal__attachment-file {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-background);
  font-size: var(--font-size-sm);
}

.modal__attachment-name {
  font-weight: var(--font-weight-medium);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.modal__attachment-size {
  color: var(--color-text-secondary);
  margin-left: auto;
}

.modal__attachment-remove {
  display: flex;
  align-items: center;
  padding: var(--spacing-xs);
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-error);
  cursor: pointer;
}

.modal__attachment-remove:hover {
  background-color: #fdecea;
}

.modal__error {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-error);
  border-radius: var(--radius-md);
  background-color: #fdecea;
  color: var(--color-error);
  font-size: var(--font-size-sm);
}

.modal__success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  text-align: center;
  color: var(--color-success);
}

.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-md) var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

.modal__button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-lg);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.modal__button--primary {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-surface);
}

.modal__button--primary:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.modal__button--primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal__button--secondary {
  background-color: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

.modal__button--secondary:hover {
  border-color: var(--color-primary);
  color: var(--color-primary-dark);
}
</style>

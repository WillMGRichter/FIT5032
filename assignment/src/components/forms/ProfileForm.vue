<script setup>
import FormInput from './FormInput.vue'
import FormTextarea from './FormTextarea.vue'

defineProps({
  profile: { type: Object, required: true },
  errors: { type: Object, required: true },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update'])

function set(field, value) {
  emit('update', { field, value })
}
</script>

<template>
  <div class="profile-form">
    <div class="profile-form__row">
      <FormInput
        id="profile-first-name"
        :model-value="profile.firstName"
        label="First name"
        type="text"
        autocomplete="given-name"
        required
        :error="errors.firstName ?? ''"
        :disabled="disabled"
        @update:model-value="set('firstName', $event)"
      />
      <FormInput
        id="profile-last-name"
        :model-value="profile.lastName"
        label="Last name"
        type="text"
        autocomplete="family-name"
        required
        :error="errors.lastName ?? ''"
        :disabled="disabled"
        @update:model-value="set('lastName', $event)"
      />
    </div>

    <FormInput
      id="profile-email"
      :model-value="profile.email"
      label="Email"
      type="email"
      autocomplete="email"
      required
      :error="errors.email ?? ''"
      :disabled="disabled"
      @update:model-value="set('email', $event)"
    />

    <FormInput
      id="profile-location"
      :model-value="profile.location"
      label="Location (optional)"
      type="text"
      placeholder="e.g. Brunswick, Melbourne"
      :error="errors.location ?? ''"
      :disabled="disabled"
      @update:model-value="set('location', $event)"
    />

    <FormTextarea
      id="profile-bio"
      :model-value="profile.bio"
      label="Bio (optional)"
      placeholder="Tell other volunteers a little about yourself…"
      :error="errors.bio ?? ''"
      :disabled="disabled"
      @update:model-value="set('bio', $event)"
    />

    <FormInput
      id="profile-image"
      :model-value="profile.profileImage"
      label="Profile image URL (optional)"
      type="url"
      placeholder="https://example.com/me.jpg"
      :error="errors.profileImage ?? ''"
      :disabled="disabled"
      @update:model-value="set('profileImage', $event)"
    />
  </div>
</template>

<style scoped>
.profile-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.profile-form__row {
  display: grid;
  gap: var(--spacing-md);
}

@media (min-width: 576px) {
  .profile-form__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

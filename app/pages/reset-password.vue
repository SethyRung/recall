<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({ layout: "empty" });
useHead({
  title: "Reset password · Recall",
  meta: [
    { name: "robots", content: "noindex, nofollow" },
    { name: "referrer", content: "no-referrer" },
  ],
});

const route = useRoute();
const { fetchSession } = useUserSession();
const { execute, status, error } = useAuthClientAction((client) => client.resetPassword);
const token = computed(() => (typeof route.query.token === "string" ? route.query.token : ""));
const invalidLink = computed(
  () => !token.value || !!route.query.error || error.value?.code === "INVALID_TOKEN",
);
const complete = ref(false);
const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128, "Password must be at most 128 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });
const state = reactive({ password: "", confirmPassword: "" });

async function onSubmit(event: FormSubmitEvent<z.infer<typeof schema>>) {
  if (invalidLink.value) return;
  await execute({ token: token.value, newPassword: event.data.password });
  if (error.value) return;

  complete.value = true;
  state.password = "";
  state.confirmPassword = "";
  await fetchSession({ force: true });
  await navigateTo("/reset-password", { replace: true });
}
</script>

<template>
  <UContainer class="min-h-dvh max-w-md flex items-center py-8">
    <UCard class="w-full" :ui="{ root: 'rounded-none', body: 'space-y-5' }">
      <div v-if="complete" class="space-y-1" role="status">
        <h1 class="text-2xl font-semibold tracking-tight">Password reset</h1>
        <p class="text-sm text-muted">
          Your password has been updated. Sign in with your new password.
        </p>
      </div>

      <template v-else-if="invalidLink">
        <div class="space-y-1" role="alert">
          <h1 class="text-2xl font-semibold tracking-tight">Reset link unavailable</h1>
          <p class="text-sm text-muted">
            This link is invalid or has expired. Request a new one below.
          </p>
        </div>
        <UButton
          to="/forgot-password"
          label="Request a new reset link"
          color="neutral"
          class="rounded-none"
          block
        />
      </template>

      <template v-else>
        <div class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight">Reset your password</h1>
          <p class="text-sm text-muted">Choose a new password with at least 8 characters.</p>
        </div>
        <UForm :state="state" :schema="schema" class="space-y-4" @submit="onSubmit">
          <UFormField label="New password" name="password">
            <UInput
              v-model="state.password"
              type="password"
              autocomplete="new-password"
              color="neutral"
              :ui="{ root: 'w-full', base: 'rounded-none' }"
            />
          </UFormField>
          <UFormField label="Confirm password" name="confirmPassword">
            <UInput
              v-model="state.confirmPassword"
              type="password"
              autocomplete="new-password"
              color="neutral"
              :ui="{ root: 'w-full', base: 'rounded-none' }"
            />
          </UFormField>
          <p v-if="error" role="alert" class="text-sm text-error">
            Couldn't reset your password. Please try again.
          </p>
          <UButton
            type="submit"
            label="Reset password"
            color="neutral"
            class="rounded-none"
            block
            :loading="status === 'pending'"
          />
        </UForm>
      </template>

      <UButton
        to="/auth"
        label="Back to sign in"
        icon="i-lucide-arrow-left"
        variant="link"
        color="neutral"
        class="p-0"
        block
      />
    </UCard>
  </UContainer>
</template>

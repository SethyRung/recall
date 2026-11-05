<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

definePageMeta({ layout: "empty" });
useHead({
  title: "Forgot password · Recall",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});

const { execute, status, error } = useAuthClientAction((client) => client.requestPasswordReset);
const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Invalid email")),
});
const state = reactive({ email: "" });
const sent = ref(false);

async function onSubmit(event: FormSubmitEvent<z.infer<typeof schema>>) {
  await execute({ email: event.data.email, redirectTo: "/reset-password" });
  if (!error.value) sent.value = true;
}
</script>

<template>
  <UContainer class="min-h-dvh max-w-md flex items-center py-8">
    <UCard class="w-full" :ui="{ root: 'rounded-none', body: 'space-y-5' }">
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ sent ? "Check your email" : "Forgot your password?" }}
        </h1>
        <p class="text-sm text-muted">
          {{
            sent
              ? "If an account exists for that email, you'll receive a password reset link. Check your spam folder too."
              : "Enter your email and we'll send you a link to reset your password."
          }}
        </p>
      </div>

      <UForm v-if="!sent" :state="state" :schema="schema" class="space-y-4" @submit="onSubmit">
        <UFormField label="Email" name="email">
          <UInput
            v-model="state.email"
            type="email"
            autocomplete="email"
            placeholder="m@example.com"
            color="neutral"
            :ui="{ root: 'w-full', base: 'rounded-none' }"
          />
        </UFormField>
        <p v-if="error" role="alert" class="text-sm text-error">
          Couldn't send the reset email. Please try again later.
        </p>
        <UButton
          type="submit"
          label="Send reset link"
          color="neutral"
          class="rounded-none"
          block
          :loading="status === 'pending'"
        />
      </UForm>

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

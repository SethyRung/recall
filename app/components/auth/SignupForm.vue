<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const { redirect } = useAuthRedirect();
const toast = useToast();

const schema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.email("Invalid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignUpInput = z.infer<typeof schema>;

const state = reactive<SignUpInput>({
  email: "",
  password: "",
  confirmPassword: "",
  name: "",
});

const showPassword = ref(false);
const showConfirmPassword = ref(false);
const loading = ref(false);

async function onSubmit(event: FormSubmitEvent<SignUpInput>) {
  try {
    loading.value = true;

    const { data } = event;

    const { error: err } = await signUp.email({
      email: data.email,
      password: data.password,
      name: data.name,
    });
    if (err) {
      toast.add({
        title: "Sign up failed",
        description: err.message ?? "Could not create your account",
        color: "error",
        icon: "i-lucide-alert-triangle",
      });
      return;
    }

    toast.add({
      title: `Welcome, ${data.name}!`,
      description: "Your account is ready.",
      color: "success",
      icon: "i-lucide-check",
    });

    await navigateTo(redirect.value || "/");
  } catch (e) {
    toast.add({
      title: "Sign up failed",
      description: (e as Error).message,
      color: "error",
      icon: "i-lucide-alert-triangle",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UCard :ui="{ root: 'rounded-none', body: 'space-y-5' }">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight">Sign up</h1>
      <p class="text-sm text-neutral-400">Enter your email below to create an account</p>
    </div>

    <UForm :state="state" :schema="schema" class="space-y-4" @submit="onSubmit">
      <UFormField label="Name" name="name">
        <UInput v-model="state.name" placeholder="John Doe" />
      </UFormField>

      <UFormField label="Email" name="email">
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="email"
          placeholder="m@example.com"
        />
      </UFormField>

      <UFormField label="Password" name="password">
        <UInput
          v-model="state.password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="new-password"
          placeholder="********"
        >
          <template #trailing>
            <button
              type="button"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              class="text-neutral-500 hover:text-neutral-300"
              @click="showPassword = !showPassword"
            >
              <UIcon :name="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
            </button>
          </template>
        </UInput>
      </UFormField>

      <UFormField label="Confirm Password" name="confirmPassword">
        <UInput
          v-model="state.confirmPassword"
          :type="showConfirmPassword ? 'text' : 'password'"
          autocomplete="new-password"
          placeholder="********"
        >
          <template #trailing>
            <button
              type="button"
              :aria-label="showConfirmPassword ? 'Hide password' : 'Show password'"
              class="text-neutral-500 hover:text-neutral-300"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <UIcon :name="showConfirmPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" />
            </button>
          </template>
        </UInput>
      </UFormField>

      <UButton type="submit" label="Sign up" block :loading="loading" />
    </UForm>

    <USeparator />

    <p class="text-center text-xs text-muted">
      By signing up, you agree to the
      <NuxtLink to="/" class="underline hover:text-toned"> Terms of Service </NuxtLink>
      and
      <NuxtLink to="/" class="underline hover:text-toned"> Privacy Policy </NuxtLink>
      .
    </p>
  </UCard>
</template>

<script setup lang="ts">
import { z } from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";

const route = useRoute();
const toast = useToast();

const redirect = computed(() => route.query.redirect as string);

const { data: session } = await useSession(useFetch);

watch(session, (sess) => {
  if (sess?.user) {
    navigateTo(redirect.value || "/admin");
  }
});

const schema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type SignInInput = z.infer<typeof schema>;

const state = reactive<SignInInput>({ email: "", password: "" });

const showPassword = ref(false);
const rememberMe = ref(false);
const loading = ref(false);
const oauthLoading = ref<"google" | "github" | null>(null);

async function onSubmit(event: FormSubmitEvent<SignInInput>) {
  try {
    loading.value = true;

    const { data } = event;

    const { error: err } = await signIn.email({
      email: data.email,
      password: data.password,
    });
    if (err) {
      toast.add({
        title: "Sign in failed",
        description: err.message ?? "Invalid email or password",
        color: "error",
        icon: "i-lucide-alert-triangle",
      });
      return;
    }

    await navigateTo(redirect.value || "/admin");
  } catch (e) {
    toast.add({
      title: "Sign in failed",
      description: (e as Error).message,
      color: "error",
      icon: "i-lucide-alert-triangle",
    });
  } finally {
    loading.value = false;
  }
}

async function signInWith(provider: "google" | "github") {}
</script>

<template>
  <UDashboardPanel>
    <template #body>
      <UContainer class="flex-1 flex flex-col justify-center max-w-md py-8">
        <UCard :ui="{ root: 'rounded-none', body: 'space-y-5' }">
          <div class="space-y-1">
            <h1 class="text-2xl font-semibold tracking-tight">Sign In</h1>
            <p class="text-sm text-neutral-400">Enter your email below to login to your account</p>
          </div>

          <UTheme
            :props="{
              button: {
                color: 'neutral',
                ui: {
                  base: 'rounded-none',
                },
              },
              checkbox: {
                color: 'neutral',
                ui: {
                  base: 'rounded-none',
                },
              },
              input: {
                color: 'neutral',
                ui: {
                  root: 'w-full',
                  base: 'rounded-none',
                },
              },
            }"
          >
            <UForm :state="state" :schema="schema" class="space-y-4" @submit="onSubmit">
              <UFormField label="Email" name="email">
                <UInput
                  v-model="state.email"
                  type="email"
                  autocomplete="email"
                  placeholder="m@example.com"
                />
              </UFormField>

              <UFormField label="Password" name="password">
                <template #hint>
                  <UButton
                    label="Forgot your password?"
                    variant="link"
                    class="underline p-0"
                    @click="
                      toast.add({
                        title: 'Contact admin to reset.',
                        color: 'neutral',
                        icon: 'i-lucide-info',
                      })
                    "
                  />
                </template>

                <UInput
                  v-model="state.password"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
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

              <UCheckbox v-model="rememberMe" label="Remember me" />

              <UButton type="submit" label="Login" block :loading="loading" />
            </UForm>

            <div class="space-y-2">
              <UButton
                icon="i-logos:google-icon"
                label="Sign In with Google"
                variant="outline"
                block
                :disabled="!!oauthLoading"
                @click="signInWith('google')"
              />

              <UButton
                icon="i-lucide:github"
                label="Sign In with GitHub"
                variant="outline"
                block
                :disabled="!!oauthLoading"
                @click="signInWith('github')"
              />
            </div>

            <USeparator />

            <p class="text-center text-xs text-muted">
              By signing in, you agree to the
              <NuxtLink to="/" class="underline hover:text-toned"> Terms of Service </NuxtLink>
              and
              <NuxtLink to="/" class="underline hover:text-toned"> Privacy Policy </NuxtLink>
              .
            </p>
          </UTheme>
        </UCard>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>

<script setup lang="ts">
import {
  appSettingsSchema,
  DEFAULT_SETTINGS,
  getEmbedCredentialType,
  settingsSecretFields,
  type AdminSettingsResponse,
  type ModelCredentialType,
} from "#shared/utils/settings";
import type { FetchError } from "ofetch";
import type { FormErrorEvent, TabsItem } from "@nuxt/ui";

const SETTINGS_SECTIONS = [
  { label: "Models", value: "models", slot: "models" as const, icon: "i-lucide-bot" },
  { label: "Knowledge", value: "knowledge", slot: "knowledge" as const, icon: "i-lucide-database" },
  { label: "Chat", value: "chat", slot: "chat" as const, icon: "i-lucide-message-circle" },
  {
    label: "Integrations",
    value: "integrations",
    slot: "integrations" as const,
    icon: "i-lucide-plug",
  },
] satisfies TabsItem[];

const { section, selectField } = useAdminSection(SETTINGS_SECTIONS);

definePageMeta({
  layout: "admin",
  auth: { only: "user", user: { role: "admin" }, redirectTo: "/auth" },
});
useHead({ title: "Settings", meta: [{ name: "robots", content: "noindex" }] });

const { data, error: loadError, refresh } = await useFetch("/api/admin/settings");
const state = reactive(appSettingsSchema.parse(data.value?.settings ?? DEFAULT_SETTINGS));
const version = ref(data.value?.version ?? 0);
const secretState = ref(data.value?.secretState ?? {});
const cleared = ref<Record<string, boolean>>({});
const embedCredentialDrafts: Partial<Record<ModelCredentialType, string>> = {};
const embedCredentialTypes = [
  { label: "API key", value: "apiKey" },
  { label: "Bearer token", value: "authToken" },
] satisfies { label: string; value: ModelCredentialType }[];
const saving = ref(false);
const errorMessage = ref("");
const alerts = computed(() => [
  ...(loadError.value
    ? [
        {
          title: "Unable to load settings",
          description: "Reload before editing. Verify the database migration is applied.",
        },
      ]
    : []),
  ...(data.value && !data.value.encryptionReady
    ? [
        {
          title: "Encryption key required",
          description: "Set a stable NUXT_APP_SECRET on the server before saving credentials.",
        },
      ]
    : []),
  ...(errorMessage.value ? [{ title: "Settings not saved", description: errorMessage.value }] : []),
]);
const alert = computed(() =>
  alerts.value.length
    ? {
        color: loadError.value || errorMessage.value ? ("error" as const) : ("warning" as const),
        title: alerts.value.length === 1 ? alerts.value[0]!.title : "Settings need attention",
        alerts: alerts.value,
      }
    : null,
);
const baseline = ref(JSON.stringify(state));
const dirty = computed(
  () => JSON.stringify(state) !== baseline.value || Object.values(cleared.value).some(Boolean),
);
const toast = useToast();
const { refresh: refreshPublicSettings } = useManagedPublicSettings();

const routingFields = [
  { key: "cooldownMs", label: "Cooldown (ms)", min: 1, max: 86400000 },
  { key: "timeoutMs", label: "Attempt timeout (ms)", min: 1, max: 300000 },
] as const;
const chunkingFields = [
  { key: "chunkSize", label: "Chunk size (characters)", min: 50, max: 20000 },
  { key: "chunkOverlap", label: "Overlap (characters)", min: 0, max: 19999 },
  { key: "minChunkLength", label: "Minimum chunk length", min: 1, max: 20000 },
  { key: "maxChunks", label: "Maximum chunks per source", min: 1, max: 2048 },
] as const;
const chatFields = [
  { key: "maxMessages", label: "Maximum messages", min: 2, max: 100 },
  { key: "maxCharsPerMessage", label: "Characters per message", min: 1, max: 32000 },
  { key: "maxTotalChars", label: "Total conversation characters", min: 1, max: 200000 },
  { key: "maxOutputTokens", label: "Maximum output tokens", min: 1, max: 32768 },
] as const;

function embedCredentialType() {
  return getEmbedCredentialType(state.embed, secretState.value);
}

function embedCredentialLabel() {
  return embedCredentialType() === "apiKey" ? "API key" : "Bearer token";
}

function embedCredentialPath() {
  return `embed.${embedCredentialType()}`;
}

function selectEmbedCredentialType(next: ModelCredentialType | undefined) {
  const previous = embedCredentialType();
  if (!next || next === previous) return;
  embedCredentialDrafts[previous] = state.embed[previous];
  state.embed[previous] = "";
  state.embed[next] = embedCredentialDrafts[next] ?? state.embed[next];
  state.embed.credentialType = next;
}

function setEmbedCleared(value: boolean | "indeterminate") {
  const checked = value === true;
  cleared.value[embedCredentialPath()] = checked;
  if (checked) state.embed[embedCredentialType()] = "";
}

function setCleared(path: string, value: boolean | "indeterminate", clear: () => void) {
  const checked = value === true;
  cleared.value[path] = checked;
  if (checked) clear();
}

function restore(value: AdminSettingsResponse) {
  Object.assign(state, appSettingsSchema.parse(value.settings));
  version.value = value.version;
  secretState.value = value.secretState;
  cleared.value = {};
  for (const type of embedCredentialTypes) delete embedCredentialDrafts[type.value];
  baseline.value = JSON.stringify(state);
  errorMessage.value = "";
}

async function reload() {
  if (dirty.value && !window.confirm("Discard unsaved settings and reload?")) return;
  await refresh();
  if (data.value) restore(data.value);
}

async function save() {
  saving.value = true;
  errorMessage.value = "";
  try {
    const validPaths = new Set(settingsSecretFields(state).map((field) => field.path));
    const result = await $fetch("/api/admin/settings", {
      method: "PUT",
      body: {
        version: version.value,
        settings: appSettingsSchema.parse(state),
        clearSecrets: Object.keys(cleared.value).filter(
          (path) => cleared.value[path] && validPaths.has(path),
        ),
      },
    });
    data.value = result;
    restore(result);
    toast.add({
      title: "Settings saved",
      description: "New requests use these settings immediately.",
      color: "success",
    });
    await refreshPublicSettings();
    await refreshNuxtData("/api/admin/stats");
  } catch (error) {
    const fetchError = error as FetchError<{ statusMessage?: string }>;
    errorMessage.value = fetchError.data?.statusMessage ?? "Unable to save settings. Try again.";
  } finally {
    saving.value = false;
  }
}

async function onFormError(event: FormErrorEvent) {
  const first = event.errors[0];
  if (!first) return;
  errorMessage.value = first.message;
  await selectField(first.name);
  await nextTick();
  const input = first.id ? document.getElementById(first.id) : null;
  input?.focus({ preventScroll: true });
  input?.scrollIntoView({ block: "center" });
}

onBeforeRouteLeave(() => !dirty.value || window.confirm("Leave with unsaved settings?"));
</script>

<template>
  <UDashboardPanel id="settings" :ui="{ body: 'p-0' }">
    <template #header>
      <UDashboardNavbar title="Settings">
        <template #leading><UDashboardSidebarCollapse /></template>
        <template #right>
          <UColorModeButton />
          <UButton
            label="Reload settings"
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="outline"
            :disabled="saving"
            @click="reload"
          />
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <UBadge
            :label="dirty ? 'Unsaved changes' : `Saved revision ${version}`"
            :color="dirty ? 'warning' : 'neutral'"
            variant="subtle"
          />
        </template>
        <template #right>
          <UButton
            type="submit"
            form="admin-settings"
            label="Save settings"
            icon="i-lucide-save"
            :loading="saving"
            :disabled="!data?.encryptionReady || !dirty || !!loadError"
          />
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <UContainer class="w-full max-w-6xl py-6 space-y-6">
        <UAlert v-if="alert" :color="alert.color" :title="alert.title" variant="subtle">
          <template #description>
            <ul class="space-y-1">
              <li v-for="item in alert.alerts" :key="item.title">
                <template v-if="alert.alerts.length > 1">
                  <span class="font-medium">{{ item.title }}:</span>
                  {{ item.description }}
                </template>
                <template v-else>{{ item.description }}</template>
              </li>
            </ul>
          </template>
        </UAlert>

        <UForm
          v-if="data && !loadError"
          id="admin-settings"
          :schema="appSettingsSchema"
          :state="state"
          :disabled="saving"
          @submit="save"
          @error="onFormError"
        >
          <USelect
            v-model="section"
            :items="SETTINGS_SECTIONS"
            aria-label="Settings section"
            class="mb-4 w-full sm:hidden"
          />
          <UTabs
            v-model="section"
            :items="SETTINGS_SECTIONS"
            variant="link"
            :unmount-on-hide="false"
            :ui="{
              list: 'hidden sm:flex',
              content: 'space-y-4',
            }"
          >
            <template #models>
              <AdminModelSettings
                v-model="state.models"
                v-model:cleared="cleared"
                :secret-state="secretState"
                :disabled="saving"
              />
              <AdminPanel
                title="Routing"
                description="One attempt per eligible model; transient errors trigger fallback before answer text starts."
              >
                <div class="grid gap-4 sm:grid-cols-2">
                  <UFormField
                    v-for="field in routingFields"
                    :key="field.key"
                    :name="`routing.${field.key}`"
                    :label="field.label"
                  >
                    <UInputNumber
                      :id="`settings-routing-${field.key}`"
                      v-model="state.routing[field.key]"
                      :min="field.min"
                      :max="field.max"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </AdminPanel>
            </template>

            <template #knowledge>
              <AdminPanel
                title="Embedding provider"
                description="OpenAI-compatible, 2048 dimensions. Export and reset the knowledge base before changing model or endpoint, then re-ingest. Credential rotation does not require reset."
              >
                <div class="grid gap-4 sm:grid-cols-2">
                  <UFormField name="embed.model" label="Model ID">
                    <UInput
                      id="settings-embed-model"
                      v-model="state.embed.model"
                      placeholder="Provider model ID"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField
                    name="embed.baseUrl"
                    label="API prefix"
                    help="Optional. Leave blank to use the provider’s default endpoint."
                  >
                    <UInput
                      id="settings-embed-baseUrl"
                      v-model="state.embed.baseUrl"
                      placeholder="https://openrouter.ai/api/v1"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField name="embed.credentialType" label="Credential type">
                    <USelect
                      id="settings-embed-credentialType"
                      :model-value="embedCredentialType()"
                      :items="embedCredentialTypes"
                      class="w-full"
                      @update:model-value="selectEmbedCredentialType($event)"
                    />
                  </UFormField>
                  <div :key="embedCredentialType()">
                    <UFormField
                      :name="embedCredentialPath()"
                      :label="embedCredentialLabel()"
                      :help="
                        secretState[embedCredentialPath()]
                          ? 'Saved securely. Leave blank to keep; enter a value to rotate.'
                          : 'No saved credential.'
                      "
                    >
                      <UInput
                        :id="`settings-embed-${embedCredentialType()}`"
                        v-model="state.embed[embedCredentialType()]"
                        type="password"
                        autocomplete="new-password"
                        :disabled="cleared[embedCredentialPath()]"
                        placeholder="New credential"
                        class="w-full"
                      />
                    </UFormField>
                    <UCheckbox
                      v-if="secretState[embedCredentialPath()]"
                      :id="`settings-embed-${embedCredentialType()}-remove`"
                      :model-value="cleared[embedCredentialPath()] === true"
                      :label="`Remove saved ${embedCredentialLabel().toLowerCase()}`"
                      class="mt-2"
                      @update:model-value="setEmbedCleared"
                    />
                  </div>
                </div>
                <p class="mt-4 text-xs text-dimmed">
                  Only the selected credential is saved; the other is removed on Save. Embeddings
                  use Bearer authentication.
                </p>
              </AdminPanel>
              <AdminPanel
                title="Retrieval"
                description="Changes apply to the next search. Reranking uses lexical relevance, not a separate provider."
              >
                <div class="grid gap-4 sm:grid-cols-2">
                  <UFormField name="retrieval.topK" label="Top K">
                    <UInputNumber
                      id="settings-retrieval-topK"
                      v-model="state.retrieval.topK"
                      :min="1"
                      :max="50"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField name="retrieval.similarityThreshold" label="Similarity threshold">
                    <UInputNumber
                      id="settings-retrieval-similarityThreshold"
                      v-model="state.retrieval.similarityThreshold"
                      :min="0"
                      :max="1"
                      :step="0.01"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField name="retrieval.hybrid" label="Hybrid search">
                    <USwitch
                      id="settings-retrieval-hybrid"
                      v-model="state.retrieval.hybrid"
                      label="Combine vector and keyword search"
                    />
                  </UFormField>
                  <UFormField name="retrieval.rerank" label="Reranking">
                    <USwitch
                      id="settings-retrieval-rerank"
                      v-model="state.retrieval.rerank"
                      label="Rerank retrieved hits"
                    />
                  </UFormField>
                </div>
              </AdminPanel>
              <AdminPanel
                title="Chunking"
                description="Applies to future ingestion. Re-ingest existing sources to apply new chunking settings; unchanged content will be reprocessed when chunking changes."
              >
                <div class="grid gap-4 sm:grid-cols-2">
                  <UFormField
                    v-for="field in chunkingFields"
                    :key="field.key"
                    :name="`chunking.${field.key}`"
                    :label="field.label"
                  >
                    <UInputNumber
                      :id="`settings-chunking-${field.key}`"
                      v-model="state.chunking[field.key]"
                      :min="field.min"
                      :max="field.max"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </AdminPanel>
            </template>

            <template #chat>
              <AdminPanel
                title="Chat limits"
                description="Limits apply to the conversation context sent to the model. Full chat history stays saved."
              >
                <div class="grid gap-4 sm:grid-cols-2">
                  <UFormField
                    v-for="field in chatFields"
                    :key="field.key"
                    :name="`chat.${field.key}`"
                    :label="field.label"
                  >
                    <UInputNumber
                      :id="`settings-chat-${field.key}`"
                      v-model="state.chat[field.key]"
                      :min="field.min"
                      :max="field.max"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </AdminPanel>
            </template>

            <template #integrations>
              <AdminPanel
                title="Password reset email"
                description="Resend sends password reset links from your verified sender address."
              >
                <div class="grid gap-4 sm:grid-cols-2">
                  <UFormField name="email.from" label="Sender address">
                    <UInput id="settings-email-from" v-model="state.email.from" class="w-full" />
                  </UFormField>
                  <div>
                    <UFormField
                      name="email.apiKey"
                      label="Resend API key"
                      :help="
                        secretState['email.apiKey']
                          ? 'Saved securely. Leave blank to keep; enter a value to rotate.'
                          : 'No saved credential.'
                      "
                    >
                      <UInput
                        id="settings-email-apiKey"
                        v-model="state.email.apiKey"
                        type="password"
                        autocomplete="new-password"
                        :disabled="cleared['email.apiKey']"
                        placeholder="New credential"
                        class="w-full"
                      />
                    </UFormField>
                    <UCheckbox
                      v-if="secretState['email.apiKey']"
                      id="settings-email-apiKey-remove"
                      :model-value="cleared['email.apiKey'] === true"
                      label="Remove saved resend api key"
                      class="mt-2"
                      @update:model-value="
                        setCleared('email.apiKey', $event, () => (state.email.apiKey = ''))
                      "
                    />
                  </div>
                </div>
              </AdminPanel>
            </template>
          </UTabs>
        </UForm>
      </UContainer>
    </template>
  </UDashboardPanel>
</template>

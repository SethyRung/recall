<script setup lang="ts">
import {
  getModelCredentialType,
  type ManagedModel,
  type ModelCredentialType,
} from "#shared/utils/settings";

const props = defineProps<{ secretState: Record<string, boolean>; disabled?: boolean }>();
const models = defineModel<ManagedModel[]>({ required: true });
const cleared = defineModel<Record<string, boolean>>("cleared", { required: true });
const baseUrlPlaceholder = "https://openrouter.ai/api/v1";
const providers = [
  { label: "Anthropic Messages", value: "anthropic" },
  { label: "OpenAI Chat Completions", value: "openai" },
] satisfies { label: string; value: ManagedModel["provider"] }[];

const credentialTypes = [
  { label: "API key", value: "apiKey" },
  { label: "Bearer token", value: "authToken" },
] satisfies { label: string; value: ModelCredentialType }[];
const credentialDrafts = new WeakMap<ManagedModel, Partial<Record<ModelCredentialType, string>>>();

function credentialType(model: ManagedModel) {
  return getModelCredentialType(model, props.secretState);
}

function credentialLabel(model: ManagedModel) {
  return credentialType(model) === "apiKey" ? "API key" : "Bearer token";
}

function credentialPath(model: ManagedModel) {
  return `models.${model.id}.${credentialType(model)}`;
}

function selectProvider(model: ManagedModel, next: ManagedModel["provider"] | undefined) {
  if (next) model.provider = next;
}
function selectCredentialType(model: ManagedModel, next: ModelCredentialType | undefined) {
  const previous = credentialType(model);
  if (!next || next === previous) return;
  const drafts = credentialDrafts.get(model) ?? {};
  drafts[previous] = model[previous];
  model[previous] = "";
  model[next] = drafts[next] ?? model[next];
  model.credentialType = next;
  credentialDrafts.set(model, drafts);
}

function add() {
  models.value.push({
    id: crypto.randomUUID(),
    enabled: true,
    provider: "openai",
    model: "",
    baseUrl: "",
    credentialType: "apiKey",
    apiKey: "",
    authToken: "",
  });
}
function move(index: number, direction: number) {
  const next = [...models.value];
  const [item] = next.splice(index, 1);
  if (item) next.splice(index + direction, 0, item);
  models.value = next;
}
function setCleared(model: ManagedModel, value: boolean | "indeterminate") {
  const checked = value === true;
  cleared.value[credentialPath(model)] = checked;
  if (checked) model[credentialType(model)] = "";
}
</script>

<template>
  <AdminPanel
    title="Chat models"
    description="Priority order, top to bottom. Models must support streaming and tool calling. Disabled models are not routed."
  >
    <template #actions>
      <UButton
        label="Add model"
        icon="i-lucide-plus"
        :disabled="disabled || models.length >= 16"
        @click="add"
      />
    </template>
    <p v-if="!models.length" class="text-sm text-muted">
      No models configured. Add a model to enable chat.
    </p>
    <div class="space-y-5">
      <article
        v-for="(model, index) in models"
        :key="`${model.id}-${index}`"
        class="border border-accented p-4 space-y-4"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="font-mono text-xs text-muted">Priority {{ index + 1 }}</p>
          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-arrow-up"
              color="neutral"
              variant="ghost"
              square
              :label="`Move model ${index + 1} up`"
              :ui="{ label: 'sr-only' }"
              :disabled="disabled || index === 0"
              @click="move(index, -1)"
            />
            <UButton
              icon="i-lucide-arrow-down"
              color="neutral"
              variant="ghost"
              square
              :label="`Move model ${index + 1} down`"
              :ui="{ label: 'sr-only' }"
              :disabled="disabled || index === models.length - 1"
              @click="move(index, 1)"
            />
            <UButton
              label="Remove"
              color="error"
              variant="ghost"
              :disabled="disabled"
              @click="models.splice(index, 1)"
            />
          </div>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField :name="`models.${index}.enabled`" label="Routing">
            <USwitch
              :id="`settings-model-${model.id}-enabled`"
              v-model="model.enabled"
              label="Enabled"
            />
          </UFormField>

          <UFormField :name="`models.${index}.provider`" label="API format">
            <USelect
              :id="`settings-model-${model.id}-provider`"
              :model-value="model.provider"
              :items="providers"
              class="w-full"
              @update:model-value="selectProvider(model, $event)"
            />
          </UFormField>

          <UFormField :name="`models.${index}.model`" label="Model ID" required>
            <UInput
              :id="`settings-model-${model.id}-model`"
              v-model="model.model"
              placeholder="Provider model ID"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :name="`models.${index}.baseUrl`"
            label="API prefix"
            help="Optional. Leave blank to use the provider’s default endpoint."
          >
            <UInput
              :id="`settings-model-${model.id}-baseUrl`"
              v-model="model.baseUrl"
              :placeholder="baseUrlPlaceholder"
              class="w-full"
            />
          </UFormField>

          <UFormField :name="`models.${index}.credentialType`" label="Credential type">
            <USelect
              :id="`settings-model-${model.id}-credentialType`"
              :model-value="credentialType(model)"
              :items="credentialTypes"
              class="w-full"
              @update:model-value="selectCredentialType(model, $event)"
            />
          </UFormField>

          <div :key="`${model.id}-${credentialType(model)}`">
            <UFormField
              :name="`models.${index}.${credentialType(model)}`"
              :label="credentialLabel(model)"
              :help="
                secretState[credentialPath(model)]
                  ? 'Saved securely. Leave blank to keep; enter a value to rotate.'
                  : 'No saved credential.'
              "
            >
              <UInput
                :id="`settings-model-${model.id}-${credentialType(model)}`"
                v-model="model[credentialType(model)]"
                type="password"
                autocomplete="new-password"
                :disabled="cleared[credentialPath(model)]"
                placeholder="New credential"
                class="w-full"
              />
            </UFormField>
            <UCheckbox
              v-if="secretState[credentialPath(model)]"
              :id="`settings-model-${model.id}-${credentialType(model)}-remove`"
              :model-value="cleared[credentialPath(model)] === true"
              :label="`Remove saved ${credentialLabel(model).toLowerCase()}`"
              class="mt-2"
              @update:model-value="setCleared(model, $event)"
            />
          </div>
        </div>
        <p class="text-xs text-dimmed">
          Only the selected credential is saved; the other is removed on Save. Anthropic API keys
          use x-api-key; OpenAI credentials use Bearer authentication.
        </p>
      </article>
    </div>
  </AdminPanel>
</template>

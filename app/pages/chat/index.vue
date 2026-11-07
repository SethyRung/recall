<script setup lang="ts">
definePageMeta({
  key: (route) => (typeof route.query.tab === "string" ? route.query.tab : "new"),
});
useHead({ title: "New session · Recall" });
</script>

<template>
  <ChatWelcome />
</template>

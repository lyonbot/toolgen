<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { compilerService } from "./services/compiler";
import { useProjectView } from "./stores/project";

const iframe = ref<HTMLIFrameElement>();
const { projectView } = useProjectView();

onMounted(setup);
async function setup() {
  await compilerService.compile(projectView.getFiles());
  const result = compilerService.resultAtom.value;
  if (!result) return;

  const js = result.wrappedJs;
  const css = result.result.css;

  const html = `<!DOCTYPE html><html>
<head>
  <style>${css}\n</style>
</head>
<body>
  <div id="root"></div>
  <script>${js}\n</${"script"}>
</body></html>`;

  iframe.value!.srcdoc = html;
}
</script>

<template>
  <div class="content">
    <i class="i-mdi-smiley text-6xl text-brand"></i>
    <h1>Rsbuild with Vue</h1>
    <iframe ref="iframe" class="h-50vh w-full"></iframe>
  </div>
</template>

<style scoped>
.content {
  @apply flex-center vflex-4;
  min-height: 100vh;
}

h1 {
  @apply text-4xl font-bold text-brand;
}

.content p {
  @apply text-xl op-80 text-brand-400;
}
</style>

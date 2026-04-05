<script setup>
import { ref, shallowRef } from "vue";
import CarInteriorView from "./CarInteriorView.vue";
import CarPaintSwitcher from "./CarPaintSwitcher.vue";
import CarShowroomScene from "./CarShowroomScene.vue";
import { CAR_PAINT_PRESETS } from "../constants/carPaints.js";

const camera = shallowRef(null);
const renderer = shallowRef(null);
const orbitControls = shallowRef(null);
const carModel = shallowRef(null);
const selectedPaint = ref(CAR_PAINT_PRESETS[0].id);

const handleSceneReady = (payload) => {
  camera.value = payload.camera;
  renderer.value = payload.renderer;
  orbitControls.value = payload.orbitControls;
  carModel.value = payload.carModel;
};
</script>

<template>
  <div class="home">
    <CarShowroomScene
      :selected-paint="selectedPaint"
      @scene-ready="handleSceneReady"
    />
    <CarPaintSwitcher
      v-model="selectedPaint"
      :presets="CAR_PAINT_PRESETS"
    />
    <CarInteriorView
      v-if="camera && renderer && orbitControls && carModel"
      :camera="camera"
      :renderer="renderer"
      :orbit-controls="orbitControls"
      :car-model="carModel"
    />
  </div>
</template>

<style scoped>
.home {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.08), transparent 40%),
    linear-gradient(180deg, #09111b 0%, #020406 100%);
}
</style>

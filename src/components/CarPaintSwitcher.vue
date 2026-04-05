<script setup>
defineProps({
  presets: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: String,
    default: "",
  },
});

defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="paint-switcher">
    <div class="paint-switcher__label">车漆切换</div>
    <div class="paint-switcher__options">
      <button
        v-for="preset in presets"
        :key="preset.id"
        class="paint-switcher__option"
        :class="{ 'is-active': modelValue === preset.id }"
        type="button"
        @click="$emit('update:modelValue', preset.id)"
      >
        <span
          class="paint-switcher__swatch"
          :style="{ background: preset.swatch }"
        ></span>
        <span class="paint-switcher__name">{{ preset.name }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.paint-switcher {
  position: absolute;
  left: 24px;
  bottom: 24px;
  z-index: 24;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 20px;
  background: rgba(8, 16, 26, 0.78);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(14px);
}

.paint-switcher__label {
  margin-bottom: 10px;
  color: rgba(255, 255, 255, 0.82);
  font-size: 13px;
  letter-spacing: 0.08em;
}

.paint-switcher__options {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  max-width: 420px;
}

.paint-switcher__option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.88);
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.paint-switcher__option:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.08);
}

.paint-switcher__option.is-active {
  border-color: rgba(255, 255, 255, 0.38);
  background: rgba(255, 255, 255, 0.12);
}

.paint-switcher__swatch {
  width: 20px;
  height: 20px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  box-shadow: inset 0 1px 3px rgba(255, 255, 255, 0.22);
}

.paint-switcher__name {
  font-size: 13px;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .paint-switcher {
    left: 16px;
    right: 16px;
    bottom: 16px;
  }

  .paint-switcher__options {
    flex-wrap: wrap;
  }
}
</style>

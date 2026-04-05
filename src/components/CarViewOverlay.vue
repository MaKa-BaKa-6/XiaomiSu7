<script setup>
defineProps({
  isInteriorView: {
    type: Boolean,
    default: false,
  },
  showHint: {
    type: Boolean,
    default: true,
  },
});

defineEmits(["exit"]);
</script>

<template>
  <div class="car-view-overlay">
    <div v-if="showHint && !isInteriorView" class="click-hint">
      点击车身进入车内视角
    </div>

    <div v-if="isInteriorView" class="interior-panel">
      <span class="view-hint">拖动查看车内</span>
      <button class="exit-btn" type="button" @click="$emit('exit')">
        退出车内视角
      </button>
      <span class="shortcut-hint">ESC</span>
    </div>
  </div>
</template>

<style scoped>
.car-view-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 20;
}

.click-hint {
  position: absolute;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  padding: 10px 18px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(4, 12, 20, 0.72);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(14px);
  color: rgba(255, 255, 255, 0.94);
  font-size: 14px;
  letter-spacing: 0.04em;
  white-space: nowrap;
  animation: breathe 2.4s ease-in-out infinite;
}

.interior-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.exit-btn,
.shortcut-hint,
.view-hint {
  pointer-events: auto;
}

.view-hint {
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.82);
  font-size: 13px;
  letter-spacing: 0.04em;
}

.exit-btn {
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  background: rgba(7, 16, 26, 0.8);
  color: #ffffff;
  padding: 10px 16px;
  font-size: 14px;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
}

.exit-btn:hover {
  transform: translateY(-1px);
  background: rgba(17, 29, 43, 0.92);
  border-color: rgba(255, 255, 255, 0.36);
}

.shortcut-hint {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  letter-spacing: 0.08em;
}

@keyframes breathe {
  0%,
  100% {
    opacity: 0.72;
    transform: translateX(-50%) translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateX(-50%) translateY(-4px);
  }
}
</style>

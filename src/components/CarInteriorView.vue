<script setup>
import * as THREE from "three";
import gsap from "gsap";
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import CarViewOverlay from "./CarViewOverlay.vue";

const props = defineProps({
  camera: Object,
  orbitControls: Object,
  carModel: Object,
  renderer: Object,
});

const emit = defineEmits(["viewChanged"]);

const isInteriorView = ref(false);
const isTransitioning = ref(false);
const isInteriorDragging = ref(false);
const showHint = ref(true);

const originalCameraPosition = new THREE.Vector3();
const originalCameraTarget = new THREE.Vector3();
const interiorCameraPosition = new THREE.Vector3(-0.36, 0.98, 0.22);
const interiorCameraTarget = new THREE.Vector3(-0.36, 0.92, -3.6);
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const dragStart = { x: 0, y: 0 };
const animatedTarget = { x: 0, y: 0, z: 0 };
const lastPointer = { x: 0, y: 0 };
const interiorLookAngles = { yaw: 0, pitch: 0 };

const INTERIOR_LOOK_DISTANCE = 4;
const INTERIOR_YAW_LIMIT = 1.15;
const INTERIOR_PITCH_MIN = -0.45;
const INTERIOR_PITCH_MAX = 0.28;
const INTERIOR_DRAG_SENSITIVITY = 0.005;

let pointerElement = null;

const isReady = computed(() => {
  return Boolean(
    props.camera && props.orbitControls && props.carModel && props.renderer,
  );
});

function syncCameraLookAt() {
  if (!props.camera || !props.orbitControls) {
    return;
  }

  props.orbitControls.target.set(
    animatedTarget.x,
    animatedTarget.y,
    animatedTarget.z,
  );
  props.camera.lookAt(props.orbitControls.target);
}

function getDirectionFromAngles(yaw, pitch) {
  const cosPitch = Math.cos(pitch);

  return new THREE.Vector3(
    Math.sin(yaw) * cosPitch,
    Math.sin(pitch),
    -Math.cos(yaw) * cosPitch,
  ).normalize();
}

function resetInteriorLook() {
  const forward = interiorCameraTarget
    .clone()
    .sub(interiorCameraPosition)
    .normalize();

  interiorLookAngles.yaw = Math.atan2(forward.x, -forward.z);
  interiorLookAngles.pitch = Math.asin(forward.y);
}

function updateInteriorLook() {
  if (!props.camera || !props.orbitControls) {
    return;
  }

  const direction = getDirectionFromAngles(
    interiorLookAngles.yaw,
    interiorLookAngles.pitch,
  );
  const lookTarget = interiorCameraPosition
    .clone()
    .add(direction.multiplyScalar(INTERIOR_LOOK_DISTANCE));

  props.camera.position.copy(interiorCameraPosition);
  props.orbitControls.target.copy(lookTarget);
  props.camera.lookAt(lookTarget);
}

function stopActiveTransition() {
  if (!props.camera) {
    return;
  }

  gsap.killTweensOf(props.camera.position);
  gsap.killTweensOf(animatedTarget);
}

function cacheCurrentView() {
  originalCameraPosition.copy(props.camera.position);
  originalCameraTarget.copy(props.orbitControls.target);
}

function animateCameraTo(position, target, onComplete) {
  stopActiveTransition();
  animatedTarget.x = props.orbitControls.target.x;
  animatedTarget.y = props.orbitControls.target.y;
  animatedTarget.z = props.orbitControls.target.z;

  gsap.to(props.camera.position, {
    x: position.x,
    y: position.y,
    z: position.z,
    duration: 1.35,
    ease: "power2.inOut",
    onUpdate: syncCameraLookAt,
  });

  gsap.to(animatedTarget, {
    x: target.x,
    y: target.y,
    z: target.z,
    duration: 1.35,
    ease: "power2.inOut",
    onUpdate: syncCameraLookAt,
    onComplete,
  });
}

function enterInteriorView() {
  if (!isReady.value || isInteriorView.value || isTransitioning.value) {
    return;
  }

  cacheCurrentView();
  props.orbitControls.enabled = false;
  isTransitioning.value = true;
  resetInteriorLook();

  animateCameraTo(interiorCameraPosition, interiorCameraTarget, () => {
    isTransitioning.value = false;
    isInteriorView.value = true;
    showHint.value = false;
    updateInteriorLook();
    emit("viewChanged", true);
  });
}

function exitInteriorView() {
  if (!isReady.value || !isInteriorView.value || isTransitioning.value) {
    return;
  }

  isTransitioning.value = true;
  animateCameraTo(originalCameraPosition, originalCameraTarget, () => {
    isTransitioning.value = false;
    isInteriorDragging.value = false;
    isInteriorView.value = false;
    showHint.value = true;
    props.orbitControls.enabled = true;
    props.orbitControls.update();
    emit("viewChanged", false);
  });
}

function collectCarMeshes() {
  const meshes = [];
  props.carModel?.scene?.traverse((child) => {
    if (child.isMesh) {
      meshes.push(child);
    }
  });
  return meshes;
}

function isClickOnCar(event) {
  if (!props.camera || !props.renderer || !props.carModel) {
    return false;
  }

  const rect = props.renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, props.camera);
  return raycaster.intersectObjects(collectCarMeshes(), true).length > 0;
}

function handlePointerDown(event) {
  dragStart.x = event.clientX;
  dragStart.y = event.clientY;
  lastPointer.x = event.clientX;
  lastPointer.y = event.clientY;

  if (isInteriorView.value && !isTransitioning.value) {
    isInteriorDragging.value = true;
    pointerElement?.setPointerCapture?.(event.pointerId);
  }
}

function handlePointerMove(event) {
  if (!isInteriorView.value || !isInteriorDragging.value || isTransitioning.value) {
    return;
  }

  const deltaX = event.clientX - lastPointer.x;
  const deltaY = event.clientY - lastPointer.y;

  lastPointer.x = event.clientX;
  lastPointer.y = event.clientY;

  interiorLookAngles.yaw -= deltaX * INTERIOR_DRAG_SENSITIVITY;
  interiorLookAngles.pitch -= deltaY * INTERIOR_DRAG_SENSITIVITY;
  interiorLookAngles.yaw = THREE.MathUtils.clamp(
    interiorLookAngles.yaw,
    -INTERIOR_YAW_LIMIT,
    INTERIOR_YAW_LIMIT,
  );
  interiorLookAngles.pitch = THREE.MathUtils.clamp(
    interiorLookAngles.pitch,
    INTERIOR_PITCH_MIN,
    INTERIOR_PITCH_MAX,
  );

  updateInteriorLook();
}

function handlePointerUp(event) {
  if (isInteriorView.value) {
    isInteriorDragging.value = false;
    pointerElement?.releasePointerCapture?.(event.pointerId);
    return;
  }

  if (isTransitioning.value) {
    return;
  }

  const movedX = Math.abs(event.clientX - dragStart.x);
  const movedY = Math.abs(event.clientY - dragStart.y);
  const isDrag = movedX > 6 || movedY > 6;

  if (!isDrag && isClickOnCar(event)) {
    enterInteriorView();
  }
}

function handleKeydown(event) {
  if (event.key === "Escape") {
    exitInteriorView();
  }
}

function bindPointerEvents() {
  const nextElement = props.renderer?.domElement;
  if (!nextElement || pointerElement === nextElement) {
    return;
  }

  unbindPointerEvents();
  pointerElement = nextElement;
  pointerElement.addEventListener("pointerdown", handlePointerDown);
  pointerElement.addEventListener("pointermove", handlePointerMove);
  pointerElement.addEventListener("pointerup", handlePointerUp);
  pointerElement.addEventListener("pointercancel", handlePointerUp);
}

function unbindPointerEvents() {
  if (!pointerElement) {
    return;
  }

  pointerElement.removeEventListener("pointerdown", handlePointerDown);
  pointerElement.removeEventListener("pointermove", handlePointerMove);
  pointerElement.removeEventListener("pointerup", handlePointerUp);
  pointerElement.removeEventListener("pointercancel", handlePointerUp);
  pointerElement = null;
}

watch(
  () => props.renderer,
  () => {
    bindPointerEvents();
  },
  { immediate: true },
);

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  stopActiveTransition();
  unbindPointerEvents();
  window.removeEventListener("keydown", handleKeydown);
});

defineExpose({
  enterInteriorView,
  exitInteriorView,
  isInteriorView,
});
</script>

<template>
  <CarViewOverlay
    :is-interior-view="isInteriorView"
    :show-hint="showHint"
    @exit="exitInteriorView"
  />
</template>

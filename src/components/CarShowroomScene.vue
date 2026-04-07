<script setup>
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { SSRPass } from "three/examples/jsm/postprocessing/SSRPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { MeshoptDecoder } from "meshoptimizer";
import gsap from "gsap";
import { onMounted, onUnmounted, ref, watch } from "vue";
import { CAR_PAINT_PRESETS } from "../constants/carPaints.js";
import HDRBlender from "../utils/HDRBlender.js";

const props = defineProps({
  selectedPaint: {
    type: String,
    default: CAR_PAINT_PRESETS[0].id,
  },
});

const emit = defineEmits(["sceneReady"]);

const container = ref(null);
const loadError = ref("");

let animationId = 0;
let scene;
let camera;
let renderer;
let orbitControls;
let composer;
let ssrPass;
let bloomPass;
let bokehPass;
let lightHDR;
let nightHDR;
let floorAoMap;
let floorNormalMap;
let floorRoughnessMap;
let floorLightMap;
let floorModel;
let carAoMap;
let carModel;
let blender;

const carWheels = [];
const carPaintMaterials = [];
const reflectiveObjects = [];
const MAX_TEXTURE_ANISOTROPY = 8;

watch(
  () => props.selectedPaint,
  () => {
    applySelectedPaint();
  },
);

function createScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(0, 1, 11);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  container.value?.appendChild(renderer.domElement);

  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.target.set(0, 0.7, 0);
  orbitControls.maxPolarAngle = Math.PI * 0.5;
  orbitControls.minDistance = 4.5;
  orbitControls.maxDistance = 12;
  orbitControls.update();

  const hemisphereLight = new THREE.HemisphereLight(0xd8ebff, 0x1a2028, 1.15);
  scene.add(hemisphereLight);

  const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.8);
  keyLight.position.set(5.5, 8.5, 6.5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 2048;
  keyLight.shadow.mapSize.height = 2048;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 50;
  keyLight.shadow.camera.left = -10;
  keyLight.shadow.camera.right = 10;
  keyLight.shadow.camera.top = 10;
  keyLight.shadow.camera.bottom = -10;
  keyLight.shadow.bias = -0.0002;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc5ddff, 1.1);
  fillLight.position.set(-6, 3.5, 4.5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 1.7);
  rimLight.position.set(0, 4, -8);
  scene.add(rimLight);

  const underLight = new THREE.PointLight(0x7fb8ff, 0.45, 18, 2);
  underLight.position.set(0, 0.9, 1.6);
  scene.add(underLight);
}

function playIntroCameraAnimation() {
  gsap.to(camera.position, {
    x: 0,
    y: 1,
    z: 6.5,
    delay: 0.2,
    duration: 4,
    ease: "power4.out",
    onUpdate: () => {
      camera.lookAt(0, 0.7, 0);
    },
  });
}

async function loadResources() {
  const rgbeLoader = new RGBELoader();
  const textureLoader = new THREE.TextureLoader();
  const modelLoader = new GLTFLoader();
  modelLoader.setMeshoptDecoder(MeshoptDecoder);

  [lightHDR, nightHDR] = await Promise.all([
    rgbeLoader.loadAsync("/textures/su7/t_env_light.hdr"),
    rgbeLoader.loadAsync("/textures/su7/t_env_night.hdr"),
  ]);
  lightHDR.mapping = nightHDR.mapping =
    THREE.EquirectangularReflectionMapping;

  floorAoMap = await textureLoader.loadAsync("/textures/su7/t_startroom_ao.raw.jpg");
  prepareTexture(floorAoMap, {
    colorSpace: THREE.NoColorSpace,
    flipY: false,
    channel: 1,
  });

  floorNormalMap = await textureLoader.loadAsync("/textures/su7/t_floor_normal.webp");
  prepareTexture(floorNormalMap, {
    colorSpace: THREE.NoColorSpace,
    flipY: false,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
  });

  floorRoughnessMap = await textureLoader.loadAsync("/textures/su7/t_floor_roughness.webp");
  prepareTexture(floorRoughnessMap, {
    colorSpace: THREE.NoColorSpace,
    flipY: false,
    wrapS: THREE.RepeatWrapping,
    wrapT: THREE.RepeatWrapping,
  });

  floorLightMap = await textureLoader.loadAsync("/textures/su7/t_startroom_light.raw.jpg");
  prepareTexture(floorLightMap, {
    colorSpace: THREE.SRGBColorSpace,
    flipY: false,
    channel: 1,
  });

  floorModel = await modelLoader.loadAsync("/models/su7/mesh/sm_startroom.raw.gltf");

  carAoMap = await textureLoader.loadAsync("/textures/su7/t_car_body_AO.raw.jpg");
  prepareTexture(carAoMap, {
    colorSpace: THREE.NoColorSpace,
    flipY: false,
    channel: 1,
  });

  carModel = await modelLoader.loadAsync("/models/su7/mesh/sm_car.gltf");
}

function prepareTexture(texture, options = {}) {
  if (!texture) {
    return;
  }

  texture.flipY = options.flipY ?? texture.flipY;
  texture.colorSpace = options.colorSpace ?? texture.colorSpace;
  texture.wrapS = options.wrapS ?? texture.wrapS;
  texture.wrapT = options.wrapT ?? texture.wrapT;

  if (options.channel !== undefined) {
    texture.channel = options.channel;
  }

  texture.anisotropy = Math.min(
    renderer.capabilities.getMaxAnisotropy(),
    MAX_TEXTURE_ANISOTROPY,
  );
}

function resetCollections() {
  carWheels.length = 0;
  carPaintMaterials.length = 0;
  reflectiveObjects.length = 0;
}

function listMaterials(material) {
  if (Array.isArray(material)) {
    return material.filter(Boolean);
  }

  return material ? [material] : [];
}

function addReflectiveObject(object) {
  if (object && !reflectiveObjects.includes(object)) {
    reflectiveObjects.push(object);
  }
}

function addCarPaintMaterial(material) {
  if (material && !carPaintMaterials.includes(material)) {
    carPaintMaterials.push(material);
  }
}

function createCarPaintMaterial(material) {
  const nextMaterial = new THREE.MeshPhysicalMaterial({
    name: material.name,
    color: material.color?.clone?.() ?? new THREE.Color("#d8eef9"),
    map: material.map ?? null,
    normalMap: material.normalMap ?? null,
    roughnessMap: material.roughnessMap ?? null,
    metalnessMap: material.metalnessMap ?? null,
    aoMap: carAoMap ?? material.aoMap ?? null,
    side: material.side ?? THREE.FrontSide,
    transparent: material.transparent ?? false,
    opacity: material.opacity ?? 1,
    flatShading: material.flatShading ?? false,
  });

  if (material.normalScale && nextMaterial.normalScale) {
    nextMaterial.normalScale.copy(material.normalScale);
  }

  nextMaterial.aoMapIntensity = material.aoMapIntensity ?? 1;
  nextMaterial.metalness = material.metalness ?? 0.12;
  nextMaterial.roughness = material.roughness ?? 0.28;
  nextMaterial.envMapIntensity = material.envMapIntensity ?? 1.45;
  nextMaterial.clearcoat = 1;
  nextMaterial.clearcoatRoughness = 0.05;
  nextMaterial.ior = 1.5;
  nextMaterial.depthWrite = material.depthWrite ?? true;
  nextMaterial.depthTest = material.depthTest ?? true;
  nextMaterial.alphaTest = material.alphaTest ?? 0;
  nextMaterial.needsUpdate = true;

  return nextMaterial;
}

function tuneCarMaterial(materialName, material) {
  if (!material) {
    return material;
  }

  if (materialName === "Car_body") {
    const carPaintMaterial = createCarPaintMaterial(material);
    addCarPaintMaterial(carPaintMaterial);
    return carPaintMaterial;
  }

  switch (materialName) {
    case "Car_window":
      material.color = new THREE.Color("#1c2632");
      material.metalness = 0;
      material.roughness = 0.08;
      material.envMapIntensity = 1.25;
      material.transparent = true;
      material.opacity = 0.32;
      material.side = THREE.DoubleSide;
      material.depthWrite = false;
      break;
    case "M_body_smoothblack":
      material.color = new THREE.Color("#141a21");
      material.metalness = 0.12;
      material.roughness = 0.2;
      material.envMapIntensity = 1.15;
      break;
    case "M_body_frostedblack":
      material.color = new THREE.Color("#181818");
      material.metalness = 0.06;
      material.roughness = 0.58;
      material.envMapIntensity = 0.72;
      break;
    case "Car_ight":
      material.metalness = 0;
      material.roughness = 0.08;
      material.envMapIntensity = 1.2;
      material.emissive = new THREE.Color("#ffd7c2");
      material.emissiveIntensity = 0.45;
      break;
    case "M_iron":
      material.color = new THREE.Color("#7f8894");
      material.metalness = 0.92;
      material.roughness = 0.24;
      material.envMapIntensity = 1.15;
      break;
    case "M_logo":
      material.metalness = 0.95;
      material.roughness = 0.16;
      material.envMapIntensity = 1.35;
      break;
    case "M_wheel":
      material.metalness = 0.92;
      material.roughness = 0.28;
      material.envMapIntensity = 1.1;
      break;
    default:
      if ("envMapIntensity" in material) {
        material.envMapIntensity = 0.95;
      }
      break;
  }

  material.needsUpdate = true;
  return material;
}

function getSelectedPaintPreset() {
  return (
    CAR_PAINT_PRESETS.find((preset) => preset.id === props.selectedPaint) ??
    CAR_PAINT_PRESETS[0]
  );
}

function applySelectedPaint() {
  const preset = getSelectedPaintPreset();

  carPaintMaterials.forEach((material) => {
    material.color.set(preset.color);
    material.metalness = preset.metalness;
    material.roughness = preset.roughness;
    material.clearcoat = preset.clearcoat;
    material.clearcoatRoughness = preset.clearcoatRoughness;
    material.envMapIntensity = preset.envMapIntensity;
    material.needsUpdate = true;
  });
}

function configureFloor() {
  floorModel.scene.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    if (child.name === "light001") {
      child.visible = false;
    }

    if (child.name === "ReflecFloor") {
      child.material.color = new THREE.Color("#161a1f");
      child.material.aoMap = floorAoMap;
      child.material.normalMap = floorNormalMap;
      child.material.normalScale = new THREE.Vector2(0.26, 0.26);
      child.material.roughnessMap = floorRoughnessMap;
      child.material.lightMap = floorLightMap;
      child.material.lightMapIntensity = 0.12;
      child.material.envMapIntensity = 0.24;
      child.material.roughness = 0.52;
      child.material.metalness = 0.04;
      child.receiveShadow = true;
      child.material.needsUpdate = true;
    }
  });
}

function configureCar() {
  resetCollections();
  carModel.scene.rotation.y = Math.PI;

  carModel.scene.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    const currentMaterials = listMaterials(child.material);
    const nextMaterials = currentMaterials.map((material) =>
      tuneCarMaterial(material.name, material),
    );

    child.material = Array.isArray(child.material)
      ? nextMaterials
      : nextMaterials[0];

    child.castShadow = true;
    child.receiveShadow = true;

    if (child.name.includes("wheel") || child.name.includes("Wheel")) {
      carWheels.push(child);
      addReflectiveObject(child);
    }

    const activeMaterials = listMaterials(child.material);
    const materialNames = activeMaterials.map((material) => material.name);

    if (
      materialNames.some((name) =>
        ["Car_body", "Car_window", "M_body_smoothblack", "M_logo", "M_iron"].includes(name),
      )
    ) {
      addReflectiveObject(child);
    }

    if (child.name.includes("Light")) {
      activeMaterials.forEach((material) => {
        material.emissive = new THREE.Color("#ffe0d2");
        material.emissiveIntensity = child.name.includes("Glass") ? 0.35 : 0.7;
      });
    }
  });

  applySelectedPaint();
}

function setupEnvironment() {
  scene.add(floorModel.scene, carModel.scene);

  blender = new HDRBlender(renderer, lightHDR, nightHDR);
  scene.environment = blender.envmap;
  blender.setWeight(0);
  blender.setIntensity(1);
  blender.update();

  const transitionState = {
    uWeight: 1,
    uIntensity: 0,
  };

  gsap.to(transitionState, {
    uWeight: 0,
    uIntensity: 1,
    delay: 0.2,
    duration: 4,
    ease: "power4.out",
    onUpdate: () => {
      blender.setWeight(transitionState.uWeight);
      blender.setIntensity(transitionState.uIntensity);
    },
  });
}

function setupPostProcessing() {
  disposePostProcessing();

  composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(innerWidth, innerHeight);

  ssrPass = new SSRPass({
    renderer,
    scene,
    camera,
    width: innerWidth,
    height: innerHeight,
    selects: reflectiveObjects,
  });
  ssrPass.opacity = 0.14;
  ssrPass.maxDistance = 3.2;
  ssrPass.thickness = 0.02;
  ssrPass.blur = true;
  ssrPass.distanceAttenuation = true;
  ssrPass.fresnel = true;
  composer.addPass(ssrPass);

  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    0.08,
    0.32,
    0.98,
  );
  composer.addPass(bloomPass);

  bokehPass = new BokehPass(scene, camera, {
    focus: 7.4,
    aperture: 0.00002,
    maxblur: 0.0016,
  });
  composer.addPass(bokehPass);
}

function disposePostProcessing() {
  ssrPass?.dispose();
  bloomPass?.dispose();
  bokehPass?.dispose();
  composer?.dispose();

  ssrPass = null;
  bloomPass = null;
  bokehPass = null;
  composer = null;
}

function animate() {
  animationId = requestAnimationFrame(animate);

  if (blender) {
    blender.update();
  }

  orbitControls?.update();

  if (carWheels.length > 0) {
    carWheels.forEach((wheel) => {
      wheel.rotation.z += 0.01;
    });
  }

  if (composer) {
    composer.render();
    return;
  }

  renderer?.render(scene, camera);
}

function handleResize() {
  if (!camera || !renderer) {
    return;
  }

  const pixelRatio = Math.min(window.devicePixelRatio, 2);

  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(innerWidth, innerHeight);

  if (composer) {
    composer.setPixelRatio(pixelRatio);
    composer.setSize(innerWidth, innerHeight);
  }
}

function cleanup() {
  cancelAnimationFrame(animationId);
  window.removeEventListener("resize", handleResize);
  disposePostProcessing();
  orbitControls?.dispose();

  if (renderer?.domElement?.parentNode) {
    renderer.domElement.parentNode.removeChild(renderer.domElement);
  }

  renderer?.dispose();
}

async function startApp() {
  loadError.value = "";
  THREE.DefaultLoadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
    console.log(`开始加载:${itemsLoaded}/${itemsTotal}`, url);
  };
  THREE.DefaultLoadingManager.onLoad = () => {
    console.log("所有资源加载完成");
  };

  createScene();

  try {
    await loadResources();
    configureFloor();
    configureCar();
    setupEnvironment();
    setupPostProcessing();
    playIntroCameraAnimation();
    animate();

    emit("sceneReady", {
      scene,
      camera,
      renderer,
      orbitControls,
      carModel,
    });
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error);
    console.error("资源加载失败:", error);
  }
}

onMounted(() => {
  startApp();
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <div ref="container" class="showroom-scene"></div>
  <div v-if="loadError" class="scene-error">
    3D 场景加载失败：{{ loadError }}
  </div>
</template>

<style scoped>
.showroom-scene {
  position: absolute;
  inset: 0;
}

.scene-error {
  position: absolute;
  left: 50%;
  top: 24px;
  transform: translateX(-50%);
  padding: 10px 16px;
  border: 1px solid rgba(255, 120, 120, 0.35);
  border-radius: 999px;
  background: rgba(40, 8, 8, 0.72);
  color: #ffd8d8;
  font-size: 13px;
  z-index: 30;
  backdrop-filter: blur(8px);
}
</style>

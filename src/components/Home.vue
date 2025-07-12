<script setup>
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ref, onMounted, onUnmounted, onUpdated } from "vue";
import gsap from "gsap";
import { MeshoptDecoder } from "meshoptimizer";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader";
import HDRBlender from "../utils/HDRBlender.js";

let home = ref(null);
let animationId;
let scene;
let camera;
let renderer;
let orbitControls;
let axesHelper;
let sceneEnvMap;
let lightHDR, nightHDR;
let floorAoMap, floorNormalMap, floorRoughnessMap, floorLightMap, floorModel;
let carAoMap, carModel;
let blender;
let isHDRTransitionComplete = false;

function intoScene() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 1000);
  camera.position.set(0, 1, 11);
  // camera.position.set(0, 1, 6.5);
  renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
  renderer.setSize(innerWidth, innerHeight);
  home.value.appendChild(renderer.domElement);
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.target.set(0, 0.7, 0);
  orbitControls.update();

  axesHelper = new THREE.AxesHelper(15);
  scene.add(axesHelper);
}

// 进场相机动画
function intoCameraAnimation() {
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

async function loadAllResources() {
  try {
    let rgbeLoader = new RGBELoader();
    let textureLoader = new THREE.TextureLoader();
    let modelLoader = new GLTFLoader();
    modelLoader.setMeshoptDecoder(MeshoptDecoder);

    // 环境贴图
    [lightHDR, nightHDR] = await Promise.all([
      rgbeLoader.loadAsync("/textures/su7/t_env_light.hdr"),
      rgbeLoader.loadAsync("/textures/su7/t_env_night.hdr"),
    ]);
    lightHDR.mapping = nightHDR.mapping =
      THREE.EquirectangularReflectionMapping;
    // lightHDR.mapping = nightHDR.mapping = THREE.CubeUVReflectionMapping;

    // 地板贴图
    floorAoMap = await textureLoader.loadAsync(
      "/textures/su7/t_startroom_ao.raw.jpg"
    );
    floorAoMap.flipY = false;
    floorAoMap.colorSpace = THREE.LinearSRGBColorSpace;
    floorAoMap.channel = 1;
    floorNormalMap = await textureLoader.loadAsync(
      "/textures/su7/t_floor_normal.webp"
    );
    floorNormalMap.flipY = false;
    floorNormalMap.colorSpace = THREE.LinearSRGBColorSpace;
    floorNormalMap.wrapS = THREE.RepeatWrapping;
    floorNormalMap.wrapT = THREE.RepeatWrapping;
    floorRoughnessMap = await textureLoader.loadAsync(
      "/textures/su7/t_floor_roughness.webp"
    );
    floorRoughnessMap.flipY = false;
    floorRoughnessMap.colorSpace = THREE.LinearSRGBColorSpace;
    floorRoughnessMap.wrapS = THREE.RepeatWrapping;
    floorRoughnessMap.wrapT = THREE.RepeatWrapping;
    floorLightMap = await textureLoader.loadAsync(
      "/textures/su7/t_startroom_light.raw.jpg"
    );
    floorLightMap.flipY = false;
    floorLightMap.colorSpace = THREE.SRGBColorSpace;
    floorLightMap.channel = 1;

    // 地板模型
    floorModel = await modelLoader.loadAsync(
      "/models/su7/mesh/sm_startroom.raw.gltf"
    );

    // 汽车贴图
    carAoMap = await textureLoader.loadAsync(
      "/textures/su7/t_car_body_AO.raw.jpg"
    );
    carAoMap.flipY = false;
    carAoMap.colorSpace = THREE.LinearSRGBColorSpace;
    carAoMap.channel = 1;

    // 汽车模型
    carModel = await modelLoader.loadAsync("/models/su7/mesh/sm_car.gltf");
    return true;
  } catch (err) {
    console.log("资源加载失败:", err);
    return false;
  }
}

async function startApp() {
  THREE.DefaultLoadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
    console.log(`开始加载:${itemsLoaded}/${itemsTotal}`);
  };
  THREE.DefaultLoadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
    const progress = (itemsLoaded / itemsTotal) * 100; // 进度
  };
  THREE.DefaultLoadingManager.onLoad = () => {
    console.log("所有资源加载完成");
  };
  intoScene();

  let success = await loadAllResources();
  if (success) {
    // 修改地板模型
    floorModel.scene.traverse((child) => {
      if (child.isMesh) {
        if (child.name == "light001") {
          child.material.emissive = new THREE.Color("white");
          child.material.toneMapping = false;
          child.material.transparent = true;
          child._alphaTest = 0.1;
        }
        if (child.name == "ReflecFloor") {
          child.material.aoMap = floorAoMap;
          child.material.normalMap = floorNormalMap;
          child.material.roughnessMap = floorRoughnessMap;
          child.material.lightMap = floorLightMap;
          child.material.envMapIntensity = 0;
        }
      }
    });

    // 修改汽车模型
    carModel.scene.rotation.y = Math.PI;
    carModel.scene.traverse((child) => {
      if (child.isMesh) {
        if (child.material.name == "Car_body") {
          child.material.aoMap = carAoMap;
        }
      }
    });

    // 添加环境贴图
    scene.environment = lightHDR;

    // 添加模型
    scene.add(floorModel.scene, carModel.scene);

    // 创建HDR混合器
    // blender = new HDRBlender(renderer, lightHDR, nightHDR);
    // scene.environment = blender.envmap;
    // 设置初始状态 - 显示nightHDR
    // blender.setWeight(0); // 0 = nightHDR
    // blender.setIntensity(1); // 全亮度
    // blender.update();

    intoCameraAnimation();
    // let obj = {
    //   uWeight: 1,
    //   uIntensity: 0,
    // };
    // gsap.to(obj, {
    //   uWeight: 0,
    //   uIntensity: 1,
    //   delay: 0.2,
    //   duration: 4,
    //   ease: "power4.out",
    //   onUpdate: () => {
    //     blender.setWeight(obj.uWeight);
    //     blender.setIntensity(obj.uIntensity);
    //     // scene.environment = blender.envmap;
    //   },
    //   // onComplete: () => {
    //   //   blender.update();
    //   // },
    // });
    animation();
  }
}

function animation() {
  animationId = requestAnimationFrame(animation);
  if (blender) {
    blender.update();
  }
  orbitControls.update();
  renderer.render(scene, camera);
}

onMounted(() => {
  startApp();
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
});

window.onresize = () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
};
</script>


<template>
  <div class="home" ref="home"></div>
</template>

<style>
</style>
// HDRBlender.js
import * as THREE from 'three';
import gsap from 'gsap';

// 实现动态环境贴图混合的类

// export default class HDRBlender {
//     constructor(renderer, envmap1, envmap2) {

//         this.renderer = renderer;
//         this.envmap1 = envmap1;
//         this.envmap2 = envmap2;

//         // 创建FBO（帧缓冲对象）
//         const size = this.getEnvMapSize(envmap1);
//         this.fbo = this.createFBO(size.width, size.height);

//         // 创建着色器材质
//         this.material = this.createShaderMaterial();


//         // 创建全屏四边形
//         this.quad = new THREE.Mesh(
//             new THREE.PlaneGeometry(2, 2),
//             this.material
//         );
//         this.scene = new THREE.Scene();
//         this.scene.add(this.quad);
//         this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

//         // 设置环境贴图属性（在FBO之后）
//         this.envmap = this.fbo.texture;
//         this.envmap.mapping = THREE.CubeUVReflectionMapping; // 修复位置
//         // this.envmap.mapping = THREE.EquirectangularReflectionMapping
//     }

//     // 获取环境贴图尺寸
//     getEnvMapSize(envmap) {
//         const image = envmap.image;
//         return {
//             width: image.width,
//             height: image.height
//         };
//     }

//     // 创建帧缓冲对象
//     createFBO(width, height) {
//         const rt = new THREE.WebGLRenderTarget(width, height, {
//             minFilter: THREE.LinearFilter,
//             magFilter: THREE.LinearFilter,
//             format: THREE.RGBAFormat,
//             type: THREE.FloatType
//         });
//         return rt;
//     }

//     // 创建着色器材质
//     createShaderMaterial() {
//         return new THREE.ShaderMaterial({
//             //   vertexShader: `
//             //     varying vec2 vUv;
//             //     void main() {
//             //       vUv = uv;
//             //       gl_Position = vec4(position, 1.0);
//             //     }
//             //   `,
//             vertexShader: `
//         uniform float iTime;
//         uniform vec3 iResolution;
//         uniform vec4 iMouse;
//         varying vec2 vUv;

//         void main(){
//             vec3 p=position;
//             gl_Position=vec4(p,1.);

//             vUv=uv;
//         }
//       `,
//             //   fragmentShader: `
//             //     uniform sampler2D uEnvmap1;
//             //     uniform sampler2D uEnvmap2;
//             //     uniform float uWeight;
//             //     uniform float uIntensity;
//             //     varying vec2 vUv;

//             //     void main() {
//             //       vec3 envmap1 = texture2D(uEnvmap1, vUv).rgb;
//             //       vec3 envmap2 = texture2D(uEnvmap2, vUv).rgb;
//             //       vec3 col = mix(envmap1, envmap2, uWeight) * uIntensity;
//             //       gl_FragColor = vec4(col, 1.0);
//             //     }
//             //   `,
//             fragmentShader: `
//         uniform float iTime;
//         uniform vec3 iResolution;
//         uniform vec4 iMouse;
//         varying vec2 vUv;

//         uniform sampler2D uEnvmap1;
//         uniform sampler2D uEnvmap2;
//         uniform float uWeight;
//         uniform float uIntensity;

//         void main(){
//             vec2 uv=vUv;
//             vec3 envmap1=texture(uEnvmap1,uv).xyz;
//             vec3 envmap2=texture(uEnvmap2,uv).xyz;
//             vec3 col=mix(envmap1,envmap2,uWeight)*uIntensity;
//             gl_FragColor=vec4(col,1.);
//         }
//       `,
//             uniforms: {
//                 uEnvmap1: { value: this.envmap1 },
//                 uEnvmap2: { value: this.envmap2 },
//                 uWeight: { value: 0 },
//                 uIntensity: { value: 1 }
//             }
//         });
//     }

//     // 更新FBO内容
//     update() {
//         this.renderer.setRenderTarget(this.fbo);
//         this.renderer.render(this.scene, this.camera);
//         this.renderer.setRenderTarget(null);
//     }

//     // 设置混合权重
//     setWeight(value) {
//         this.material.uniforms.uWeight.value = value;
//     }

//     // 设置强度
//     setIntensity(value) {
//         this.material.uniforms.uIntensity.value = value;
//     }

//     // 平滑过渡权重
//     lerpWeight(value, duration) {
//         gsap.to(this.material.uniforms.uWeight, {
//             value,
//             duration,
//             ease: "power2.out"
//         });
//     }
// }

export default class HDRBlender {
  constructor(renderer, envmap1, envmap2) {
    this.renderer = renderer;
    this.envmap1 = envmap1;
    this.envmap2 = envmap2;
    
    // 创建混合用的渲染目标
    const size = this.getEnvMapSize(envmap1);
    this.fbo = this.createFBO(size.width, size.height);
    
    // 创建着色器材质
    this.material = this.createShaderMaterial();
    
    // 创建全屏四边形
    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.material
    );
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    // 设置输出环境贴图
    this.envmap = this.fbo.texture;
    this.envmap.mapping = THREE.EquirectangularReflectionMapping;
    
    // 初始更新
    this.update();
  }

  getEnvMapSize(envmap) {
    const image = envmap.image;
    return {
      width: image.width,
      height: image.height
    };
  }

  createFBO(width, height) {
    return new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType
    });
  }

  createShaderMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uEnvmap1: { value: this.envmap1 },
      uEnvmap2: { value: this.envmap2 },
      uWeight: { value: 1 },
      uIntensity: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uEnvmap1;
      uniform sampler2D uEnvmap2;
      uniform float uWeight;
      uniform float uIntensity;
      varying vec2 vUv;

      void main() {
        // 直接使用UV坐标采样
        vec3 env1 = texture2D(uEnvmap1, vUv).rgb;
        vec3 env2 = texture2D(uEnvmap2, vUv).rgb;
        
        // 混合结果
        vec3 blended = mix(env1, env2, uWeight) * uIntensity;
        gl_FragColor = vec4(blended, 1.0);
      }
    `
  });
  }
  update() {
    this.renderer.setRenderTarget(this.fbo);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    this.envmap.needsUpdate = true;
  }

  setWeight(value) {
    this.material.uniforms.uWeight.value = value;
  }

  setIntensity(value) {
    this.material.uniforms.uIntensity.value = value;
  }
}

// export default class HDRBlender {
//   constructor(renderer, envmap1, envmap2) {
//     this.renderer = renderer;
//     this.envmap1 = envmap1;
//     this.envmap2 = envmap2;
    
//     // 创建混合用的渲染目标
//     const size = this.getEnvMapSize(envmap1);
//     this.fbo = this.createFBO(size.width, size.height);
    
//     // 创建着色器材质
//     this.material = this.createShaderMaterial();
    
//     // 创建全屏四边形
//     this.quad = new THREE.Mesh(
//       new THREE.PlaneGeometry(2, 2),
//       this.material
//     );
//     this.scene = new THREE.Scene();
//     this.scene.add(this.quad);
//     this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
//     // 设置输出环境贴图
//     this.envmap = this.fbo.texture;
//     this.envmap.mapping = THREE.EquirectangularReflectionMapping;
//   }

//   getEnvMapSize(envmap) {
//     const image = envmap.image;
//     return {
//       width: image.width,
//       height: image.height
//     };
//   }

//   createFBO(width, height) {
//     return new THREE.WebGLRenderTarget(width, height, {
//       minFilter: THREE.LinearFilter,
//       magFilter: THREE.LinearFilter,
//       format: THREE.RGBAFormat,
//       type: THREE.FloatType
//     });
//   }

//   createShaderMaterial() {
//     return new THREE.ShaderMaterial({
//       uniforms: {
//         uEnvmap1: { value: this.envmap1 },
//         uEnvmap2: { value: this.envmap2 },
//         uWeight: { value: 0 },
//         uIntensity: { value: 1 }
//       },
//       vertexShader: `
//         varying vec2 vUv;
//         void main() {
//           vUv = uv;
//           gl_Position = vec4(position, 1.0);
//         }
//       `,
//       fragmentShader: `
//         uniform sampler2D uEnvmap1;
//         uniform sampler2D uEnvmap2;
//         uniform float uWeight;
//         uniform float uIntensity;
//         varying vec2 vUv;

//         void main() {
//           vec3 env1 = texture2D(uEnvmap1, vUv).rgb;
//           vec3 env2 = texture2D(uEnvmap2, vUv).rgb;
//           vec3 blended = mix(env1, env2, uWeight) * uIntensity;
//           gl_FragColor = vec4(blended, 1.0);
//         }
//       `
//     });
//   }

//   update() {
//     this.renderer.setRenderTarget(this.fbo);
//     this.renderer.render(this.scene, this.camera);
//     this.renderer.setRenderTarget(null);
//   }

//   setWeight(value) {
//     this.material.uniforms.uWeight.value = value;
//     this.update(); // 权重变化时立即更新
//   }

//   setIntensity(value) {
//     this.material.uniforms.uIntensity.value = value;
//     this.update(); // 强度变化时立即更新
//   }
// }
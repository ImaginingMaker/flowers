import * as THREE from 'three'

export function windMaterial(grass = false) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 }, uNight: { value: 0 }, uReveal: { value: 1 },
      uWind: { value: 1 }, uGrass: { value: grass ? 1 : 0 },
      uVisibility: { value: 1 }, uFogStrength: { value: 1 }, uExposure: { value: 1 },
      uFogDay: { value: new THREE.Color('#eec6a1') },
      uFogNight: { value: new THREE.Color('#253346') },
    },
    vertexShader: `
      attribute vec3 color;
      attribute vec3 aBudPosition;
      attribute vec3 aBudNormal;
      attribute float aPetal;
      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vWorld;
      varying float vHeight;
      varying float vPetal;
      uniform float uTime;
      uniform float uReveal;
      uniform float uWind;
      void main() {
        vec3 origin = (modelMatrix * instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
        float petal = step(0., aPetal);
        float bloom = clamp(uReveal * 1.32 - max(aPetal, 0.) * .32, 0., 1.);
        bloom = bloom * bloom * (3. - 2. * bloom);
        vec3 p = mix(position, mix(aBudPosition, position, bloom), petal);
        vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.);
        float phase = origin.x * .7 + origin.z * .45;
        float wind = sin(uTime * 1.1 + phase) * .6 + sin(uTime * .62 + origin.z * .29) * .4;
        world.x += wind * position.y * position.y * .085 * uWind * uReveal;
        world.z += cos(uTime * .8 + phase) * position.y * .025 * uWind;
        vColor = color;
        vHeight = position.y;
        vec3 poseNormal = normalize(mix(normal, mix(aBudNormal, normal, bloom), petal));
        vec3 worldNormal = normalize(mat3(modelMatrix * instanceMatrix) * poseNormal);
        float scale = max(.1, length(instanceMatrix[1].xyz));
        worldNormal.y -= wind * position.y * .17 * uWind * uReveal / scale * worldNormal.x;
        vNormal = normalize(worldNormal);
        vWorld = world.xyz;
        vPetal = petal;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vWorld;
      varying float vHeight;
      varying float vPetal;
      uniform float uNight;
      uniform float uGrass;
      uniform vec3 uFogDay;
      uniform vec3 uFogNight;
      uniform float uVisibility;
      uniform float uFogStrength;
      uniform float uExposure;
      void main() {
        float grain = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
        if (uVisibility < grain) discard;
        vec3 n = normalize(vNormal) * (gl_FrontFacing ? 1. : -1.);
        float light = dot(n, normalize(vec3(-.6, .8, .6)));
        float softLight = smoothstep(-.5, .8, light);
        float fill = clamp((dot(n, normalize(vec3(.8, .3, -.4))) + .35) / 1.35, 0., 1.);
        float rim = pow(1. - abs(dot(n, normalize(cameraPosition - vWorld))), 2.2);
        float transmission = pow(max(-light, 0.), 2.) * vPetal;
        vec3 day = vColor * (.66 + softLight * .46 + fill * .09) * vec3(1.1, 1.01, .91);
        day += vColor * vec3(1., .77, .53) * transmission * .15;
        day += vec3(.026, .019, .009) * rim * vPetal;
        day += vec3(.045, .022, .004) * pow(softLight, 3.);
        vec3 night = vColor * (.34 + softLight * .37 + fill * .07) * vec3(.78, .91, 1.2);
        night += vColor * vec3(.6, .66, .86) * transmission * .09;
        night += vColor * vec3(.13, .065, .055) * smoothstep(1.35, 2., vHeight);
        vec3 c = mix(day, night, uNight) * uExposure;
        c *= mix(1., .6 + vHeight * .4, uGrass);
        float distanceFog = 1. - exp(-length(cameraPosition - vWorld) * mix(.017, .026, uNight) * uFogStrength);
        c = mix(c, mix(uFogDay, uFogNight, uNight), distanceFog);
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
}

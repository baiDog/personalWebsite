<script setup lang="ts">
import { onUnmounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import Stats from 'three/examples/jsm/libs/stats.module.js';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
let container,
stats: any,
clock: THREE.Clock,
gui,
mixer: THREE.AnimationMixer,
actions: { [x: string]: any; },
activeAction: any,previousAction: any;

let camera: THREE.PerspectiveCamera,
scene: THREE.Scene,
controls: any,
renderer: THREE.WebGLRenderer,
model: any, face;

const statesInit = 'Idle';
// model状态及表情
const states = [ 'Idle', 'Walking', 'Running', 'Dance', 'Death', 'Sitting', 'Standing' ];
const emotes = [ 'Jump', 'Yes', 'No', 'Wave', 'Punch', 'ThumbsUp' ];

const StateKey: Record<string, any> = { // 状态与键盘key对应关系；
  'KeyW': 'Walking', // w
  'Space': 'Jump', // 空格
  'KeyQ': {
    auto: 'Punch',
    once: 'Punch', // 单次执行，且不改变状态
  }, // q
  'Digit1': {
    auto: 'Standing',
    ctrl: 'Yes',
    once: 'Yes',
  }, // 1
  'Digit2': {
    auto: 'Dance',
    ctrl: 'No',
    once: 'No',
  }, // 2
  'Digit3': {
    auto: 'Death',
    ctrl: 'Wave',
    once: 'Wave',
  }, // 3
  'Digit4': {
    auto: 'Sitting',
    ctrl: 'ThumbsUp',
    once: 'ThumbsUp',
  }, // 4
};

let isMoving: boolean = false; // 正在动作
const movingSpeed = 0.1;   // 每帧（1s 60帧）多少距离

const api: Record<string, any> = { state: statesInit }; // 默认状态改为站立

const renderInit = () => {
    container = document.createElement( 'div' );
    document.body.appendChild(container);
    clock = new THREE.Clock();
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    container.appendChild( renderer.domElement );
    // stats
    stats = new Stats();
    container.appendChild( stats.dom );
}
// 场景
const sceneInit = () => {
    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xe0e0e0 );
    scene.fog = new THREE.Fog( 0xe0e0e0, 20, 100 );
}
// 相机
const cameraInit = () => {
  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.25, 100 );
  camera.position.set( - 9, 3, 17 );
  camera.lookAt( new THREE.Vector3( 0, 2, 0 ) );
}
const createControls = ( cameraInit: any ) => {
    controls = new OrbitControls( cameraInit, renderer.domElement );
    // controls.listenToKeyEvents( window ); // optional
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 16;
    controls.maxDistance = 50;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI * 89/ 180;
  }
// 光
const lightInit = () => {
    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
    hemiLight.position.set( 0, 20, 0 );
    scene.add( hemiLight );
    
    const dirLight = new THREE.DirectionalLight( 0xffffff );
    dirLight.position.set( 0, 20, 10 );
    scene.add( dirLight );
};
// 地板
const groudInit = () => {
    const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
    mesh.rotation.x = - Math.PI / 2;
    scene.add( mesh );

    const grid: any = new THREE.GridHelper( 200, 40, 0x000000, 0x000000 );
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add( grid );
}
// 模型
const modelInit = () => {
  const loader = new GLTFLoader();
    loader.load( 'src/assets/models/RobotExpressive.glb', function ( gltf ) {
      model = gltf.scene;
      scene.add( model );
      createGUI( model, gltf.animations );
    }, undefined, function ( e ) {
      console.error( e );
    } );
}
// 模型绑定状态
function createGUI( model: any, animations: string | any[] ) {
  gui = new GUI();
  mixer = new THREE.AnimationMixer( model );
  actions = {};
  for ( let i = 0; i < animations.length; i ++ ) {
    const clip = animations[ i ];
    const action = mixer.clipAction( clip );
    actions[ clip.name ] = action;
    if ( emotes.indexOf( clip.name ) >= 0 || states.indexOf( clip.name ) >= 4 ) {
      action.clampWhenFinished = true;
      action.loop = THREE.LoopOnce;
    }
  }
  // gui状态切换
  // states -状态切换
  // const statesFolder = gui.addFolder( 'States' );
  // const clipCtrl = statesFolder.add( api, 'state' ).options( states );
  // clipCtrl.onChange( function () {
  //   fadeToAction( api.state, 0.5 );
  // } );
  // statesFolder.open();
  // emotes -- 表情
  // const emoteFolder = gui.addFolder( 'Emotes' );
  // function createEmoteCallback( name: string ) {
  //   api[ name ] = function () {
  //     fadeToAction( name, 0.2 );
  //     mixer.addEventListener( 'finished', restoreState );
  //   };
  //   emoteFolder.add( api, name );
  // }

  // function restoreState() {
  //   mixer.removeEventListener( 'finished', restoreState );
  //   fadeToAction( api.state, 0.2 );
  // }

  // for ( let i = 0; i < emotes.length; i ++ ) {
  //   createEmoteCallback( emotes[ i ] );
  // }
  // emoteFolder.open();

  // expressions 脸的 表达
  face = model.getObjectByName( 'Head_4' );
  const expressions = Object.keys( face.morphTargetDictionary );
  const expressionFolder = gui.addFolder( '表情微调' );
  for ( let i = 0; i < expressions.length; i ++ ) {
    expressionFolder.add( face.morphTargetInfluences, i, 0, 1, 0.01 ).name( expressions[ i ] );
  }

  activeAction = actions[ 'Standing' ];
  if (activeAction) {
    activeAction.play();
  }
  expressionFolder.open();
}
// 状态切换
function fadeToAction( name: string, duration: number ) {
  previousAction = activeAction;
  activeAction = actions[ name ];
  if ( previousAction !== activeAction && previousAction ) {
    previousAction.fadeOut( duration );

  }
  activeAction
    .reset()
    .setEffectiveTimeScale( 1 )
    .setEffectiveWeight( 1 )
    .fadeIn( duration )
    .play();
}

const animate = () => {
  const dt = clock.getDelta();
  if ( mixer ) mixer.update( dt );
  controls.update();
  requestAnimationFrame( animate );
  renderer.render( scene, camera );
  stats.update();
  // 走路位置刷新
  if (api.state === 'Walking' && model) {
    // 计算新的model位置
    model.position.x = model.position.x + movingSpeed * Math.cos(model.rotation.y - Math.PI/2);
    model.position.z = model.position.z - movingSpeed * Math.sin(model.rotation.y - Math.PI/2);
    // 固定相机位置于 模型后面
    camera.position.x = camera.position.x + movingSpeed * Math.cos(model.rotation.y - Math.PI/2);
    camera.position.z = camera.position.z - movingSpeed * Math.sin(model.rotation.y - Math.PI/2);
    controls.target = new THREE.Vector3(model.position.x, model.position.y, model.position.z); // 重置控制器方向
  }
}
// 移除监听及动画
function restoreState() {
    mixer.removeEventListener( 'finished', restoreState );
    api.state = statesInit;
    fadeToAction( api.state, 0.5 );
    setTimeout(() => {
      isMoving = false;
    }, 500);
  }
// 按键
const onKeyDown = (e: any) => {
  const ctrlKey = e.ctrlKey || e.metaKey; // control
  if (StateKey[e.code] && !isMoving) {
    const nameNow = ctrlKey && StateKey[e.code].ctrl ? StateKey[e.code].ctrl : (StateKey[e.code].auto || StateKey[e.code]);
    if (api.state !== nameNow) {
      if (StateKey[e.code].once && StateKey[e.code].once.includes(nameNow)) { // 只执行一次
        isMoving = true;
        fadeToAction( nameNow, 0.2 );
        mixer.addEventListener( 'finished', restoreState );  
      } else {
        api.state = nameNow; // 切换状态及执行动画
        fadeToAction( api.state, 0.5 );
      }
    }
  }
  else if(e.code === 'KeyA' && model) { // 控制机器人转向（可以调小一点，这样会丝滑一些）
    model.rotation.y += Math.PI / 4;
  }
  else if(e.code === 'KeyD' && model) { // 控制机器人转向
    model.rotation.y -= Math.PI / 4;
  }
  e.preventDefault();
}
const onKeyUp = (e: any) => {
  if (!isMoving && !['KeyA', 'KeyD'].includes(e.code)) { // 转向，不切换，机器人状态
    api.state = statesInit;
    fadeToAction( api.state, 0.5 );
  }
}

const init = () => {
  renderInit();
  sceneInit();
  cameraInit();
  createControls(camera);
  lightInit();
  groudInit();
  modelInit();

  window.addEventListener( 'keydown' , onKeyDown, false );
  window.addEventListener('keyup', onKeyUp, false);
}
init();
// 动画
animate();

onUnmounted(() => {
  window.removeEventListener( 'keydown' , onKeyDown, false );
  window.removeEventListener( 'keyup', onKeyUp, false );
})
</script>

<template>
  <div></div>
</template>

<style>
 *{
   padding:0;
   margin: 0;
 }
 html, body {
   height: 100%;
   width: 100%;
 }
</style>

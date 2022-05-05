/// <reference types="vite/client" />

declare module "three/examples/jsm/libs/lil-gui.module.min.js";
declare module "three/examples/jsm/libs/stats.module.js";

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}

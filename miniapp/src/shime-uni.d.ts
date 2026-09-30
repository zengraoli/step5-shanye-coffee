export {};

declare module "vue" {
  type Hooks = App.AppInstance & Page.PageInstance;
  interface ComponentCustomOptions extends Hooks {}
}
/** ?raw 导入（测试里用于读取源码做守卫断言） */
declare module "*.vue?raw" {
  const content: string;
  export default content;
}

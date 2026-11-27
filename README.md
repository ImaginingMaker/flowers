# 花语小庭 · Hanakotoba

以手机屏幕为优先目标的 React 实时 3D 花语庭院。奶油纸色、暖色花瓣、柔和卡通光照和自然风动，视觉灵感来自日系手绘动画里的植物与日常浪漫。

## 启动

```sh
npm ci
npm run dev
```

打开终端输出的地址，默认 http://localhost:5173 。项目已经保存 TRAE Run 按钮配置：`.trae/environments/run.json`。开发服务器监听局域网地址，同一网络中的手机可以使用电脑的局域网 IP 和端口访问。

```sh
npm run build
npm run preview
```

使用 Node.js 22.12+；本次构建环境为 Node.js 24.18。依赖版本由 `package-lock.json` 锁定。

## 技术调研与选型

2026-11-27 通过网络搜索，并实际打开以下官方文档核对。

| 需求 | 本项目选择 | 依据与取舍 |
| --- | --- | --- |
| React 场景管理 | React 19 + React Three Fiber 9 | [R3F Introduction](https://r3f.docs.pmnd.rs/getting-started/introduction) 明确说明它是 Three.js 的 React renderer，并给出 React 19 / Fiber 9 的主版本配对。花瓣、花茎、光照作为可组合 React 组件。 |
| 浏览器实时 3D | Three.js / WebGL | 保持成熟的 WebGL 路径；官方 R3F 页面说明 v10 的 WebGPU 当时仍为 alpha，本次不采用预览版本。 |
| 统一动画植物风格 | MeshToonMaterial、顶点色、五阶渐变光照 | [Three.js MeshToonMaterial](https://threejs.org/docs/pages/MeshToonMaterial.html#gradientMap) 规定渐变贴图使用 NearestFilter。用顶点渐变表现根部与花瓣边缘的色差，避免写实高光带来的塑料质感。 |
| 触摸交互 | @use-gesture/react | [官方手势文档](https://use-gesture.netlify.app/docs/gestures/) 提供 drag、pinch 与组合手势，并说明触摸拖动需要设置 touch-action。本项目将手势限制在花束区域，页面其他部分保留正常滚动。 |
| 手机性能 | 像素密度上限、几何体复用、后台停止帧循环 | [R3F Scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance) 解释持续渲染的能耗、按需渲染、资源复用、实例化和动态分辨率。当前风动需要持续绘制；切到后台或打开遮罩后停止绘制，音效同时暂停。 |
| 建模与加载 | 本地参数曲面 + TubeGeometry | 当前不需要下载 GLB 或图片。根据曲面参数构造花瓣、弯曲叶片和自然花茎，按花种复用花瓣几何体；未来需要精细艺术资产时，可改用 Blender → glTF/GLB → R3F 的工作流。 |

本次实际安装：React 19.3.1、R3F 9.8.2、Three.js 0.180.0、use-gesture 10.3.1、TypeScript 5.9.3、Vite 7.3.8。

没有加入全屏后期处理、实时投影阴影或外部 HDR 环境贴图，先将资源投入花瓣造型与移动端的稳定性。中心光晕和纸感由 CSS / SVG 程序纹理绘制；主花束是可旋转的真实三维几何体。中文衬线字体优先加载 Noto Serif SC，网络不可用时使用系统宋体回退。

## 已实现

- 郁金香、玫瑰、波斯菊、雏菊四种三枝花束；暖色花瓣与统一植物绿。
- 左右滑动切换，点击花卡切换，键盘左右箭头切换。
- 上下拖动旋转、双指缩放、自动旋转、重置视角。
- 盛开 / 含苞动画；切换花种时平滑收起与出现。
- 花语、诗句、花种拉丁名；花语是创作性的浪漫解读，文化与花色可能对应不同寓意。
- 本地收藏、我的花园、全部花种选择、关于小庭。
- 可选环境声音：Web Audio 合成风声与柔和音符，默认关闭。
- 后台暂停、低帧率降 DPR、系统减少动态效果偏好、WebGL 失败提示与重试。
- 键盘可达按钮、状态播报、弹窗 Escape 关闭与焦点锁定。

## 文件

```text
src/App.tsx                  页面、收藏、弹窗、手势
src/FlowerScene.tsx          三维花束、相机、风动、花朵过渡
src/geometry.ts              花瓣曲面、叶片与花茎建模
src/data.ts                  花种、花语与暖色调色板
src/FlowerIllustration.tsx   花种导航的原创 SVG 植物标记
src/ambient.ts               Web Audio 环境声音
src/styles.css               响应式页面与纸感视觉
```

## 验证与边界

- `npm run build`：TypeScript 检查与生产打包通过。
- 在 Chromium 浏览器中实际渲染四种花束，检查盛开前后造型；通过触摸事件验证横滑切花、上下旋转及双指缩放。
- 收藏刷新恢复、我的花园、环境声音开关、键盘切换验证通过。
- 主动模拟 WebGL context 丢失后，故障提示与重试恢复通过；减少动态效果偏好和弹窗焦点锁定验证通过。测试浏览器记录未出现 JavaScript 运行时异常。
- 320、375、390、430、768、1365 像素宽度检查未发现横向溢出；390 × 844 视口下页面完整呈现。更矮的屏幕允许正常纵向滚动。
- 浏览器设备模拟不等于真实手机验收；尚未在真实 iPhone Safari / Android Chrome 上测量持续帧率、温度与耗电。不声称所有设备达到 60 FPS。
- 三维渲染依赖 WebGL 2 支持；不可用时提供植物插画、提示与重试入口。
- 首次进入时懒加载 Three.js / R3F 场景；当前场景包约 240 KB gzip，Vite 仍会提示未压缩 chunk 较大。
- 这是完整可运行的程序化建模初版。进一步接近精细动画电影质感，可继续引入人工雕刻花瓣、局部植物纹理与更细致的叶片组织；移动设备性能需要随之重新验证。

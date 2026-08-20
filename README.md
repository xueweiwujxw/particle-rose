# Particle Rose

一个基于 WebGL 的交互式 GPU 粒子玫瑰花束。项目将玫瑰 OBJ 模型采样为点云，在浏览器中组合成 68 朵相互交叠的粉、白、红色玫瑰，并加入花枝、束带和褶皱塑料包装。

**在线演示：[https://xueweiwujxw.github.io/particle-rose/](https://xueweiwujxw.github.io/particle-rose/)**

## 特性

- 自定义 WebGL 顶点/片元着色器，不依赖 Three.js 等 3D 渲染库
- 68 朵完整玫瑰随机交叠，颜色以粉白为主并点缀红色
- GPU 粒子花瓣、花枝、束带、褶皱透明包装和环境漂浮粒子
- 支持鼠标或触摸拖拽旋转、滚轮缩放、自动旋转和视角重置
- 针对桌面与移动端使用不同粒子密度
- WebGL 不可用时提供 Canvas 2D 静态回退
- 推送到 `main` 后由 GitHub Actions 自动构建并发布到 GitHub Pages

## 技术栈

- Next.js 16
- React 19
- TypeScript
- WebGL 1.0 / GLSL
- GitHub Actions / GitHub Pages

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 构建

```bash
npm run build
```

Next.js 会执行静态导出，生成的网页位于 `out/`。

## 重新生成玫瑰点云

`source-assets/rose-source.obj` 是玫瑰源模型，生成脚本会进行表面采样并写入 `public/rose-points.bin`：

```bash
npm run generate:model
```

## 项目结构

```text
app/
  WebGLBouquet.tsx   WebGL 场景、着色器和交互逻辑
  globals.css        页面样式
  layout.tsx         页面元数据和根布局
  page.tsx           首页入口
public/
  rose-points.bin    浏览器加载的玫瑰点云
scripts/
  build-rose-points.mjs
source-assets/
  rose-source.obj
.github/workflows/
  pages.yml          自动构建与发布
```

## 许可证

项目使用 [MIT License](LICENSE)。第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

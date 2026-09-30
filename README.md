# 小学语文字帖

统编版小学 1–6 年级语文写字表 A4 字帖（田字格、描红、笔顺分步），纯静态 PWA，可离线使用。线上地址：<https://fymdchenwei.github.io/zitie/>。

## 目录结构

- `app/`：PWA 本体（页面、样式、字库与笔顺数据、字体、Service Worker）
- `tools/`：构建脚本（重组字库、生成 `app/sw.js` 等）
- `samples/`：示例字帖
- `mockup/`：界面效果图
- `REPORT.md`：调研报告

## 本地预览

在仓库根目录执行：

```bash
python3 -m http.server -d app
```

浏览器打开 <http://127.0.0.1:8000/>。

## 页眉汉字

默认页眉写在 `app/config.js` 的 `headerChars`。界面里也可以临时修改，修改会保存在本机。

## 数据与许可

- 字库数据来自开源仓库 [fsiceangel/zishi](https://github.com/fsiceangel/zishi)（未声明许可，公开发布前需处理）。
- 笔顺数据 hanzi-writer-data 使用 Arphic Public License。
- 字体霞鹜文楷使用 SIL OFL 1.1。
- 许可文件在 `app/licenses`。

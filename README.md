# 小学语文字帖

统编版小学 1–6 年级语文写字表 A4 字帖（田字格、描红、笔顺分步），纯静态 PWA，可离线使用。线上地址：<https://fymdchenwei.github.io/zitie/>。

## 目录结构

- `app/`：PWA 本体（页面、样式、字库与笔顺数据、字体、Service Worker）
- `tools/`：构建脚本（重组字库、生成 `app/sw.js` 等）
- `samples/`：示例字帖
- `mockup/`：旧版界面效果图
- `mockup-v2/`：当前设置页 / 结果页效果图（线上 <https://fymdchenwei.github.io/zitie/mockup-v2/>）
- `REPORT.md`：调研报告

## 本地预览

在仓库根目录执行：

```bash
python3 -m http.server -d app
```

浏览器打开 <http://127.0.0.1:8000/>。按线上子路径预览时，把 `app/` 挂到 `/zitie/` 再打开该地址。

## 使用

设置页选择年级、学期、单元和姓名，点底部「确认生成」进入结果页；结果页可「返回设置」。年级是 1–6 的大按钮，学期是「上学期 / 下学期」，单元按当前册列出（一般是第 1–8 单元）。

姓名下拉默认是「不加姓名」，这时只生成所选年级、学期、单元的全部写字表生字，一字一行。选「陈一」或「陈佳怡」时，先按姓名每个字各生成一行，紧接着才是该单元的全部生字；姓名印在每页页眉。行版式仍是拼音、笔顺分步、1 个标准字、4 个描红格、其余空白田字格。姓名选项在 `app/config.js` 的 `names`。

结果页「打印」打开系统打印（含 AirPrint）。「保存为PDF」打开同一个打印对话框，在其中选择“另存为 PDF”。

## 字体

设置页可以选择字体，作用于字帖里的标准字和描红。默认是「笔画楷体」：沿用笔画轮廓，标准字、描红和笔顺分步是同一套数据，不是字体文件。

另外四种是离线字体文件，标准字和浅灰描红使用同一个字形。笔顺分步只在「笔画楷体」下出现。拼音始终用霞鹜文楷。

| 选项 | 实际字体 | 说明 |
| --- | --- | --- |
| 笔画楷体（默认） | 笔画 SVG（hanzi-writer-data） | 含笔顺分步 |
| 楷体 | 霞鹜文楷 GB 子集 | 已随应用打包，SIL OFL 1.1 |
| 宋体 | 思源宋体 / Noto Serif SC 子集 | `app/fonts/ZitieSong-subset.woff2` |
| 黑体 | 思源黑体 / Noto Sans SC 子集 | `app/fonts/ZitieHei-subset.woff2` |
| 仿宋 | 朱雀仿宋 v0.212 预览版子集 | 上游仍标为测试版；`app/fonts/ZitieFang-subset.woff2` |

写字表和姓名用到的字都在这几个子集里，没有缺字。子集文件大约是：楷体 1.6 MB（原本就有）、宋体 439 KB、黑体 342 KB、仿宋 847 KB。子集不用上游的保留字体名。许可说明在 `app/licenses/`。

## 姓名拼音与离线数据

拼音写在 `app/config.js` 的 `namePinyin`，并随 `config.js` 进入 Service Worker 预缓存：

| 字 | 拼音 | 笔顺（`app/data/strokes.json`） |
| --- | --- | --- |
| 陈 | chén | 7 笔 |
| 一 | yī | 1 笔 |
| 佳 | jiā | 8 笔 |
| 怡 | yí | 8 笔 |

「一」「佳」「怡」的课本读音也在 `app/data/zitie-data.json` 里；「陈」不在写字表数据中，姓名拼音以 `config.js` 为准。四字笔顺均已打进离线包。

## 数据与许可

- 字库数据来自开源仓库 [fsiceangel/zishi](https://github.com/fsiceangel/zishi)（未声明许可，公开发布前需处理）。
- 笔顺数据 hanzi-writer-data 使用 Arphic Public License。
- 字体霞鹜文楷使用 SIL OFL 1.1。
- 许可文件在 `app/licenses`。

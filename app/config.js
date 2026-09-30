// 易改配置项。姓名和拼音随本文件被 Service Worker 预缓存，离线可用。
export const CONFIG = {
  // 姓名下拉，另有默认项「不加姓名」（只生成本单元生字）。
  // 选中后按姓名每个字各生成一行，放在生字前面，并印在页眉。
  names: ['陈一', '陈佳怡'],
  namePinyin: {
    陈: 'chén',
    一: 'yī',
    佳: 'jiā',
    怡: 'yí',
  },
  // 字体。默认 stroke：标准字、描红、笔顺都用笔画轮廓（不是字体文件）。
  // 其余选项用离线 woff2 画标准字和描红（描红为同一字形的浅灰）。
  // 楷体是已打包的霞鹜文楷；宋体/黑体来自思源（Noto Serif SC / Noto Sans SC）子集；
  // 仿宋是朱雀仿宋 v0.212 预览版子集。拼音始终用霞鹜文楷。
  defaultFont: 'stroke',
  fonts: [
    { id: 'stroke', label: '笔画楷体（默认）', family: '' },
    { id: 'kai', label: '楷体', family: 'WenKai' },
    { id: 'song', label: '宋体', family: 'ZitieSong' },
    { id: 'hei', label: '黑体', family: 'ZitieHei' },
    { id: 'fang', label: '仿宋', family: 'ZitieFang' },
  ],
  // 行版式默认值（A4，单位 mm）。设置页不再暴露这些控件，结果页沿用这一行版式。
  gridMm: 18,          // 田字格边长
  traceCount: 4,       // 标准字之后的描红格数，其余为空白格
  showStrokeSteps: true,
  pageMargin: { top: 9, bottom: 8, side: 10 },
  headerHeightMm: 18,
};

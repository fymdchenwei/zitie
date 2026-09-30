// 易改配置项。姓名和拼音随本文件被 Service Worker 预缓存，离线可用。
export const CONFIG = {
  // 页眉姓名下拉。选中后按姓名里的每个字各生成一行，不再固定印「陈 一 佳 怡」。
  names: ['陈一', '陈佳怡'],
  namePinyin: {
    陈: 'chén',
    一: 'yī',
    佳: 'jiā',
    怡: 'yí',
  },
  // 行版式默认值（A4，单位 mm）。设置页不再暴露这些控件，结果页沿用这一行版式。
  gridMm: 18,          // 田字格边长
  traceCount: 4,       // 标准字之后的描红格数，其余为空白格
  showStrokeSteps: true,
  pageMargin: { top: 9, bottom: 8, side: 10 },
  headerHeightMm: 18,
};

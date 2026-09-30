// 易改配置项 —— 直接修改这里即可；界面里也可临时修改页眉（保存在本机 localStorage）。
export const CONFIG = {
  // 页眉汉字（按顺序显示，中间用 headerSeparator 连接）。
  // 最终确认：陈、一、佳、怡（陈=耳东陈；佳=亻+圭；怡=忄+台）
  headerChars: ['陈', '一', '佳', '怡'],
  headerSeparator: ' ',
  // 版式默认值（A4，单位 mm）
  gridMm: 18,          // 田字格边长：16 / 18 / 20
  traceRatio: 0.4,     // 描红格占（每行格数-1）的比例，其余为空白格
  showStrokeSteps: true,
  pageMargin: { top: 9, bottom: 8, side: 10 },
  headerHeightMm: 17,
};

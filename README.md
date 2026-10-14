# 旋核对战 SpinCore

P0 网页 MVP：环形训练场 + NPC 对战。卡通金属风，零件数值全部来自 `public/data/*.json`。界面只使用游戏内名称（裂羽 / 炽牙 / 寒枢 / 岩冕 / 崩拳 / 涡轮 / 苍弓 / 夜羽 等）。

## 本地运行

```bash
npm install
npm run dev
```

开发服务器默认：`http://127.0.0.1:43180`

```bash
npm run build
```

## 操作

| 场景 | 操作 |
| --- | --- |
| 工坊 | 点三槽换刃/轴/尖；一键套装 `PS01` 击飞流、`PS02` 钉子流、`PS03` 万金油（初始解锁）；当前零件可强化 0–15 级 |
| 训练场 | 按住「发射青核 / 橙核」或空格 0.3–1.2 秒后松开；右侧可换对照尖，观察轨迹 |
| NPC 对战 | 按住发射或空格；对手按脚本蓄力。满蓄有 8% 过冲 |
| 结算 | 再来一局（新种子）或回放本局（同种子 + 同发射参数） |

计分：极限击飞 3 / 出局 2 / 爆裂 2 / 停转 1。先到 4 分；最多 3 局；40 秒超时比剩余转速。

属性克制：攻击 > 持久 > 防御 > 攻击，±10%。

## 配置驱动

- `public/data/parts.json`：BL01–BL08 / AX01–AX06 / TP01–TP06（含免责声明）
- `public/data/presets.json`：PS01–PS03 与基础套对照
- `public/data/formulas.json`：四维公式、克制、分值
- `public/data/npcs.json`：10 套对手（3 套可打）

新增 N 阶刃：只需在 `parts.blades` 追加一条（`id/name/type/rarity/impact/stamina/defense/burst`），工坊会自动列出。轴尖同理。`cover` / `guard` 默认 5。

## P0 清单

| 项目 | 状态 |
| --- | --- |
| 圆形场地 + 外圈加速轨 + 4 个袋口 + 浅心坑 | 已完成 |
| 蓄力发射（0.3–1.2s，满蓄 8% 过冲） | 已完成 |
| 两枚刚体旋核碰撞 + 转速随摩擦/重量衰减 | 已完成 |
| 四类轴尖轨迹可辨（平/圆/针/切换） | 已完成 |
| 工坊三槽 + 四维条 + 运动标签 + PS01/02/03 | 已完成 |
| 8 刃 / 6 轴 / 6 尖全部读 JSON | 已完成 |
| 训练场 + 3 场可打 NPC（另 7 套占位） | 已完成 |
| 计分与 3 局 4 分、40s 超时 | 已完成 |
| 结算 + 再战 / 回放 | 已完成 |
| PS03 初始套装 | 已完成 |
| 同套装 + 发射参数 + 种子可复现 | 已完成（固定步长 + 种子 RNG；跨浏览器浮点可能有细差） |
| 抽卡经济 / 实时 1v1 / 赛季手册 / 第二场地 | **未做（P0 范围外）** |
| 强化 15 级 | **P0.5 已接**：工坊 ± 级，按零件 ID 本地保存；四维加算 `level × enhance_per_level`；对战/训练/回放生效 |

## 部署到 Vercel

仓库：https://github.com/mingyuewan/spincore

1. 在 GitHub 安装 [Vercel GitHub App](https://github.com/apps/vercel)（授权 `mingyuewan/spincore`）。
2. 打开 [Import 项目](https://vercel.com/new/import?s=https://github.com/mingyuewan/spincore)，选中该仓库后 Deploy。
3. Framework 选 Vite；Build Command `npm run build`；Output `dist`（`vercel.json` 已写好）。

## 技术

Vite + React + TypeScript + Tailwind + Matter.js

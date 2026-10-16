# Periodic 3D

繁體中文優先的互動式元素週期表。第一階段為 2D 週期表、搜尋、分類圖例與元素詳細資訊；第二階段將以相同資料建立 Three.js／React Three Fiber 3D 場景。

## 開發

```bash
npm install
npm run dev          # http://localhost:3000
```

| 指令 | 用途 |
| --- | --- |
| `npm test` | Vitest：資料完整性、版面、搜尋、元件互動 |
| `npm run typecheck` | `tsc --noEmit`（strict） |
| `npm run lint` | ESLint |
| `npm run build` | Production build（靜態輸出） |
| `npm run data:build` | 由 `data-sources/` 重新產生 `public/data/elements.json` |
| `npm run data:check` | 確認 `elements.json` 與來源同步 |
| `npm run check` | 以上全部 |

## 結構

```
data-sources/                 原始資料（可追溯）與繁中名稱／簡介
scripts/build-elements.mjs    合併、正規化並交叉核對 → public/data/elements.json
src/types/element.ts          資料型別
src/data/                     categories.ts（分類定義）、elements.ts（資料入口）
src/lib/                      element-layout（網格位置、鍵盤導覽）、element-utils（搜尋、格式化）、element-colors、atom-model（原子殼層 3D 座標）、webgl-support
src/hooks/useElements.ts      選取／搜尋／分類標示狀態（2D 與 3D 共用）
src/components/periodic-table PeriodicExplorer、PeriodicTable2D、ElementTile2D、ElementDetails、ElementSearch、CategoryLegend
src/components/three-d        AtomViewer（3D 原子殼層，延遲載入）、SceneCanvas／CameraControls／SceneBoundary（共用 R3F 基礎）、PeriodicTable3D（第二階段整合點）
tests/                        Vitest 測試
```

## 資料來源

| 欄位 | 來源 |
| --- | --- |
| 符號、英文名稱、分類、電子排布 | [PubChem Periodic Table](https://pubchem.ncbi.nlm.nih.gov/periodic-table/) |
| 標準原子量 | [CIAAW Abridged Standard Atomic Weights 2024](https://www.ciaaw.org/abridged-atomic-weights.htm) |
| 無標準原子量元素的質量數 | [CIAAW Radioactive Elements](https://www.ciaaw.org/radioactive-elements.htm)（NUBASE2020） |
| 電子排布交叉核對（Z ≤ 110） | [NIST Atomic Spectra Database](https://physics.nist.gov/PhysRefData/ASD/ionEnergy.html) |
| 中文名稱 | 中華民國教育部／國家教育研究院公布用字 |
| 注音、同音字 | [國家教育研究院 化學名詞-化學元素](https://data.gov.tw/dataset/14843)；Z ≤ 103 另與教育部《重編國語辭典修訂本》（[萌典](https://www.moedict.tw/)）交叉核對 |

慣例與限制：

- 族採 IUPAC 2021 臨時建議（第 3 族為 Sc、Y、Lu、Lr）；La–Yb、Ac–No 的 `group` 為 `null`。版面仍依常見慣例將 57–71、89–103 置於下方。
- Lr 電子排布採 NIST 的 7p¹（PubChem 為 6d¹）。
- 109–118 號元素的分類與電子排布為理論預測（`categoryPredicted`、`electronConfigurationPredicted`）。
- 部分元素的最穩定同位素尚無定論，候選值保存在 `massNumberAlternatives`。
- 105–108、117、118 號元素的中文字位於 CJK 擴充區，舊系統字型可能無法顯示。

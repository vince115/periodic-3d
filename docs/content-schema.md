# 元素分類與科普故事：資料格式與查核流程

本文件說明「元素分類 → 分類導讀 → 元素故事」系統的資料結構、分類規則與查核流程。

## 資料集與關聯

| 資料集 | 位置 | 產生方式 | 內容 |
| --- | --- | --- | --- |
| 元素資料 | `public/data/elements.json` | `npm run data:build` 由 `data-sources/` 產生，**請勿手改** | 118 個元素的基本資料、分類標籤、家族、金屬性、相鄰元素 |
| 分類規則 | `data-sources/element-classification.json` | 手動維護 | 次要標籤、爭議／預測狀態、家族名單、金屬性例外，每條規則附依據 |
| 分類導讀 | `src/content/elementCategories.json` | 手動撰寫 | 10 個入門分類的定義、規則、原理與導讀文章 |
| 元素故事 | `src/content/elementStories.json` | 手動撰寫 | 個別元素的科學故事（以原子序關聯） |
| 參考文獻 | `src/content/contentReferences.json` | 手動維護 | 共用書目與是否實際查閱 |

基本元素資料只存在 `elements.json`；分類導讀以分類 ID、故事以原子序（`elementNumber`）關聯，不重複維護名稱、符號、原子量等欄位。

## 元素分類欄位（elements.json 新增）

```ts
categoryTags: Array<{
  id: ElementCategoryId;          // 10 個入門分類之一
  role: "primary" | "secondary";  // primary = 既有的顯示分類（決定顏色）
  status: "established" | "convention" | "disputed" | "predicted";
  noteZh: string | null;          // 爭議或次要標籤的說明
}>;                               // 第一個一定是 primary
familyTags: Array<"pnictogen" | "chalcogen" | "rare-earth-metal" | "platinum-group-metal" | "transactinide">;
metallicity: "metal" | "metalloid" | "nonmetal" | "uncertain";
classificationNoteZh: string | null;  // 例：氫在第 1 族但不是鹼金屬
relatedElementNumbers: number[];      // 週期表相鄰元素（同週期左右、同族上下；f 區上下列對應）
```

既有欄位（`category`、`group`、`notesZh` 等）全部保留，舊功能不受影響。

### 分類規則摘要

- **主要標籤**沿用 PubChem GroupBlock（既有的 `category`），決定方格顏色。
- **成員名單**以 IUPAC Red Book 2005 §IR-3.5 的集合名稱為準：鹼金屬 Li–Fr（不含 H）、鹼土金屬 Be–Ra、鹵素 F–At、稀有氣體 He–Rn、鑭系 La–Lu、錒系 Ac–Lr、稀土金屬 Sc、Y＋鑭系、氮族、氧族。
- **過渡金屬**：第 3–12 族；IUPAC 註明第 12 族「並非總是包含在內」，因此 Zn、Cd、Hg 標為 `disputed`。
- **重疊**：Lu、Lr 依 IUPAC 2021 臨時建議屬第 3 族，加上 `transition-metal` 次要標籤（`convention`）。Po 主要為類金屬（`disputed`），另加「其他金屬」次要標籤。
- **預測**：Z ≥ 109 的分類一律標為 `predicted`，金屬性為 `uncertain`。
- **類金屬**、**其他金屬**、**其他非金屬**不是 IUPAC 正式集合名稱，導讀文章中明確說明。

## 內容格式

### 分類導讀（elementCategories.json → `categories[]`）

| 欄位 | 說明 |
| --- | --- |
| `id`, `nameZh`, `nameEn` | 分類 ID 與名稱 |
| `definitionZh`, `rulesZh[]`, `exceptionsZh[]` | 定義、判斷規則、例外與爭議 |
| `sharedPropertiesZh[]`, `principleZh` | 共同特性、背後原理 |
| `representativeElements[]` | 代表元素原子序（測試確認都帶有此分類標籤） |
| `article.title`, `article.sections[]`, `article.thinkingQuestionZh` | 導讀文章（約 500–800 字）與延伸思考 |
| `referenceIds[]`, `verification`, `version` | 參考來源、查核狀態、版本日期 |

### 元素故事（elementStories.json → `stories[]`）

| 欄位 | 說明 |
| --- | --- |
| `elementNumber` | 元素 ID（原子序） |
| `title`, `openingZh`, `sections[]` | 標題、開場現象、正文（約 200–400 字） |
| `thinkingQuestionZh` | 延伸思考問題 |
| `categoryIds[]` | 相關分類（必須是該元素的標籤） |
| `furtherReadingElementNumbers[]` | 延伸閱讀元素 |
| `referenceIds[]`, `verification`, `version` | 參考來源、查核狀態、版本日期 |

### 參考來源 ID

- 書目 ID：見 `contentReferences.json`（`accessed: null` 代表引用背景文獻但未取得全文）。
- `pubchem-element:<原子序>`：PubChem 元素頁（收錄 Los Alamos National Laboratory、Jefferson Lab、CIAAW 與 IUPAC IPTEI 的文字）。
  - 每次下載並閱讀元素頁，都要在 `contentReferences.json` 的 `elementPagesRead`（日期 → 原子序）登記；引用未登記的元素頁，測試會失敗。
  - 同一元素頁在不同日期讀過兩次以上時，必須寫成 `pubchem-element:<原子序>@<閱讀日期>`，指明主張是對照哪一次閱讀的內容。
- `ciaaw:<英文元素名>`：CIAAW 元素頁。

## 查核狀態

| 狀態 | 意義 |
| --- | --- |
| `pending` 待查核 | 已撰寫，尚未逐項比對來源 |
| `partial` 部分查核 | 部分主張已比對；其餘（例如僅引用未取得全文的文獻）待查 |
| `source-checked` 已對照來源 | 每項事實主張都已與「實際查閱過」的引用來源比對 |
| `expert-reviewed` 專家審閱 | 經具專業背景者審閱；**不可由撰寫者自行標記** |

自動測試（`tests/content.test.ts`）強制：`source-checked` 的文章所引用的每個來源都必須有 `accessed` 日期，且任何內容都不得自行標為 `expert-reviewed`。

## 新增一篇元素故事（第三階段流程）

1. 先查閱 PubChem 元素頁與 CIAAW 元素頁（或其他可信來源），記下可支持的事實與原文，並在 `elementPagesRead` 登記閱讀日期。
2. 在 `elementStories.json` 新增一筆，只寫來源能支持的內容；不虛構歷史、人物或引用。
3. 涉及有毒、放射性或高反應性元素時採安全科普敘述，不提供操作步驟。
4. 依實際比對結果填寫 `verification.status` 與 `notesZh`（列出已比對與待查的主張）。
5. 執行 `npm test`：測試會檢查字數、繁體用字、連結與查核規則。
6. 來源之間互相矛盾時（例如發現年份不同），在正文並陳或省略，並在 `notesZh` 記錄差異，不自行裁定。

第三階段依分類分批撰寫：第 1 批鹼金屬與鹼土金屬、第 2 批鹵素與稀有氣體、第 3 批其他非金屬與類金屬、第 4 批其他金屬、第 5、6 批第 4、5 週期過渡金屬（皆於 2026-10-18 對照 PubChem 元素頁）。

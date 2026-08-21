# Solar Lab 実装ルール

## 絶対禁止
- npm / package.json / ビルドツールの導入
- React / Vue / Three.js など、あらゆるライブラリの追加（CDN 含む）
- 物理エンジンライブラリの使用（法則を壊せなくなるため）
- `docs/design_v1.md` と `docs/solar_pannel/decisions.md` の編集（設計変更は人間が決める）
- 頼まれていないリファクタ・ファイル追加・最適化

## 依存の向き（逆流させない）
data.js → physics.js → render.js → main.js
- physics.js は DOM を一切触らない（document / canvas を書かない）
- render.js は物理を計算しない（座標変換と描画だけ）
- main.js だけが両者を繋ぎ、DOM イベントを扱う

## 単位系
AU / 年 / 太陽質量。SI 単位（m, kg, s）を使わない。
G = 4π² であって 6.674e-11 ではない。

## コードの書き方
- ES Modules（`type="module"`）。バンドルしない
- 識別子は英語、コメントは日本語、UI 文字列は日本語
- 力の計算はすべて physics.js の computeAccel() の中だけで行う
  （ここに集約されていることが、このアプリの設計の全部）

## 公開方針
- GitHub Pages では公開しない。自分用のツールとして作る
- 説明文（スライダーの物理的背景など）は最小限でよい
- ライセンスファイルは付けない

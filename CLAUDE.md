# CLAUDE.md — J₁-J₂ Ising Model

See README.md for full project documentation.

## パラメータ変換（UI層 → 計算層）

計算コア（Metropolis）は **(K₁, K₂, h̃)** 空間で動作する。UI値からの変換:

```
K₁ = J₁_sign / T*
K₂ = K₁ · (J₂ / J₁)
h̃  = h / T*
```

UIはT*（無次元温度、常に正）とJ₁_sign（±1トグル）を保持し、計算層に渡す前に変換する。

## 設計原則

1. **UI層と計算層の分離** — UIはT*空間、計算コアはK空間。変換は薄いアダプタ層のみ。
2. **スピン配置の補間は確率的に** — 値の平均は±1制約を破壊する。常にサイトごとの確率的選択（逆距離重み）を使う。
3. **物理的誠実さ** — 熱化インジケーター表示、ヒステリシスの隠蔽回避。

## スタック

| レイヤー | 技術 |
|---------|------|
| ブラウザ計算 | Rust → WebAssembly (wasm-pack) |
| UI | React |
| 事前計算 | Python (numpy) or Rust |

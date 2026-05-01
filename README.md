# J₁-J₂ Ising Model Interactive Visualization

J₁-J₂ Ising模型のインタラクティブWeb可視化・シミュレーションツール。ブラウザ側でWebAssemblyによるMetropolisシミュレーションをリアルタイム実行できる構成。

## 物理モデル

### ハミルトニアン

```
βH = −K₁ Σ_{⟨ij⟩} sᵢsⱼ − K₂ Σ_{⟪ij⟫} sᵢsⱼ − h̃ Σᵢ sᵢ
```

- sᵢ ∈ {+1, −1}（Isingスピン）
- ⟨ij⟩: 最近接ペア、⟪ij⟫: 次近接ペア
- 周期境界条件

### パラメータ空間

正準表現（計算層）: **(K₁, K₂, h̃)** — Metropolisの受理確率計算はこの空間で行う。

| 記号 | 定義 | 意味 |
|------|------|------|
| K₁ | βJ₁ = J₁ / k_BT | 最近接結合（正: FM、負: AFM） |
| K₂ | βJ₂ | 次近接結合 |
| h̃ | βh | 無次元外場 |

高温極限は原点 K₁ = K₂ = h̃ = 0 に統一され、J₁の符号によらず連続。

### UI表現（UI層）

| UI変数 | 定義 | 型 |
|--------|------|-----|
| T* = k_BT / \|J₁\| | 無次元温度（常に正） | セグメント型セレクター |
| J₁_sign ∈ {+1, −1} | FM / AFM トグル | トグルスイッチ |
| h | 外場 | スライダー |
| J₂ | 次近接結合 | スライダー |

UI → 計算層への変換:
```
K₁ = J₁_sign / T*
K₂ = K₁ · (J₂ / J₁)
h̃  = h / T*
```

### 臨界点

| 量 | 2D正方格子 | 3D単純立方格子 |
|----|-----------|---------------|
| T*_c | 2.269 (Onsager) | ≈ 4.51 |
| K_c | 0.4407 | 0.2217 |
| frustration境界 | J₂/J₁ ≈ 0.5 | J₂/J₁ ≈ 0.5 |

## アーキテクチャ

```
ブラウザ
──────────────────
ランダム初期配置
     ↓
WASM Metropolis (Rust)
     ↓
React UI で可視化
```

| レイヤー | 技術 |
|---------|------|
| ブラウザ計算 | Rust → WebAssembly (wasm-pack) |
| UI | React |
| ホスティング | Vercel（静的エクスポート） |

**純JSではなくWASMが必須**: 臨界点付近の相関時間発散を考慮すると、10〜100倍の速度差が体感に直結する。

## Development

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### WASMの再ビルド

```bash
cd ising-core
wasm-pack build --target web --out-dir ../public/wasm
```

## License

[MIT](https://choosealicense.com/licenses/mit/)

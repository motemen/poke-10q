# ポケモン10問

10の質問で、あなたの思い浮かべたポケモンを当てます（当てられるとは言っていない）。

ポケモンは 1025 匹、Yes/No の質問 10 回で区別できるのは 2^10 = 1024 匹まで。
なのでこのサイトは毎回きっちり「残り 2 匹」まで絞り込み、最後は 2 択を当てずっぽうで答えます。

## 動かし方

ビルド不要。`index.html` をブラウザで開くだけです（`file://` でも動きます）。
ポケモンの画像は [PokeAPI/sprites](https://github.com/PokeAPI/sprites) の `sprites/pokemon/{id}.png` を直接読み込みます。

main に push すると GitHub Actions（`.github/workflows/pages.yml`）で GitHub Pages に公開されます。

## データの再生成

`data/pokemon.js` は [PokeAPI のCSV](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv) から生成しています。

```sh
mkdir csv && cd csv
for f in pokemon_species pokemon pokemon_types pokemon_species_names; do
  curl -sfO https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/$f.csv
done
cd .. && node scripts/build-data.mjs csv
```

## Artifact 用ビルド

claude.ai の Artifact では外部の画像を読めないので、CSS・JS・データをインライン化した `dist/index.html` と、
全ポケモンの画像を 1 枚にまとめたスプライトシート `dist/sprites.png` を作ります（どちらもリポジトリには入れません）。

```sh
python3 scripts/build-sprites.py <PokeAPI/sprites の 1.png〜1025.png を置いたディレクトリ>
node scripts/build-artifact.mjs
```

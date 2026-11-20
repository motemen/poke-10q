# ポケモン10問

10の質問で、あなたの思い浮かべたポケモンを当てます（当てられるとは言っていない）。

ポケモンは 1025 匹、Yes/No の質問 10 回で区別できるのは 2^10 = 1024 匹まで。
なのでこのサイトは毎回きっちり「残り 2 匹」まで絞り込み、最後は 2 択を当てずっぽうで答えます。

## 動かし方

ビルド不要。`index.html` をブラウザで開くだけです（`file://` でも動きます）。

## データの再生成

`data/pokemon.js` は [PokeAPI のCSV](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv) から生成しています。

```sh
mkdir csv && cd csv
for f in pokemon_species pokemon pokemon_types pokemon_species_names; do
  curl -sfO https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/$f.csv
done
cd .. && node scripts/build-data.mjs csv
```

画像は [PokeAPI/sprites](https://github.com/PokeAPI/sprites) の `sprites/pokemon/{id}.png` を
1 枚のスプライトシート `sprites.png` にまとめて使っています（外部画像を読めない環境でも表示できるように）。

```sh
python3 scripts/build-sprites.py <1.png〜1025.png を置いたディレクトリ>
```

## Artifact 用ビルド

claude.ai の Artifact 向けに、CSS・JS・データをインライン化した `dist/index.html` と `dist/sprites.png` を作ります。

```sh
node scripts/build-artifact.mjs
```

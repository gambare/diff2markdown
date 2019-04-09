- git diff情報をmarkdownフォーマットとして出力します
- node v10.15.0 で動作
- 使用例

```bash
git diff | node diff2md.js
node diff2md.js diff_file.diff
```

- 出力例

```md
## path/to/file.txt

### hash

- `-aaaaaaaa`
- `+bbbbbbbb`

### row

- `-1,74`
- `+1,74`

```diff
diff情報
+  aaaaaa;
+  iiiiii;
```

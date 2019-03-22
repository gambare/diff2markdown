// TODO 新ファイルのときは、コードをdiffではなく、拡張子にしたほうがよい？

const RowOf = {
  empty: Symbol(),
  filePath: Symbol('^((\\+\\+\\+)|---) (a|b)[^ ]+?$'),
  header: Symbol('^diff --git a\\/([^ ]+?) b\\/([^ ]+?)$'),
  newFile: Symbol('^new file mode \\d+$'),
  hash: Symbol('^index ([0-9a-z]{7,8})\\.\\.([0-9a-z]{7,8}) \\d{6}$'),
  modify: Symbol('^@@ -(\\d+?,\\d+?) \\+(\\d+?,\\d+?) @@(.*?)$'),
  sentence: Symbol(),
}

class DiffParser {

  constructor() {
    this.defaultEncode = 'utf8'
    this.lineCode = '\n'
  }

  parse(file) {
    const rows = file.split(this.lineCode)
    return this.classify(rows).map(diffFile => diffFile.render()).join('').trim()
  }

  getDescription(i) {
    return String(RowOf[i]).slice(7, -1) // node10では descriptionを未サポート
  }

  determineRowType(row) {
    if (!row) return RowOf.empty
    for (let i of Object.keys(RowOf)) {
      if (RowOf.hasOwnProperty(i)) {
        const pattern = this.getDescription(i)
        if (pattern && new RegExp(pattern).test(row)) {
          return RowOf[i]
        }
      }
    }
    return RowOf.sentence
  }



  classify(rows) {
    const diffs = []
    let diff
    rows.forEach(row => {
      switch (this.determineRowType(row)) {
        case RowOf.empty:
        case RowOf.filePath:
          return
        case RowOf.header:
          if (diff) diffs.push(diff)
          diff = new DiffFile()
          diff.filePath = this.pickFilePathInHeader(row)
          return
        case RowOf.newFile:
          return diff.createBlock()
        case RowOf.hash:
          const hashes = this.parseHash(row)
          diff.prevHash = hashes.prevHash
          diff.currHash = hashes.currHash
          return
        case RowOf.modify:
          return diff.createBlock(this.parseRow(row))
        default:
          return diff.addSentence(row)
      }
    })
    diff && diffs.push(diff)
    return diffs
  }

  parseHash(row) {
    const matches = row.match(this.getDescription('hash'))
    if (!matches) throw Error("this is not hash row")
    return {prevHash: matches[1], currHash: matches[2]}
  }

  parseRow(row) {
    const matches = row.match(this.getDescription('modify'))
    if (!matches) throw Error("this is not row row")
    return {prevRow: matches[1], currRow: matches[2], rowInfo: matches[3]}
  }

  pickFilePathInHeader(header) {
    // TODO: 新規ファイルに対応していない
    const matches = header.match(this.getDescription('header'))
    if (!matches) throw Error("this is not header row")
    if (matches[1] !== matches[2]) throw Error("header file name is not match")
    return matches[1]
  }
}


class DiffFile {
  constructor() {
    this._filePath = ""
    this._prevHash = ""
    this._currHash = ""
    this._blocks = []
    this._currentBlock
  }

  set filePath(filePath) {
    this._filePath = filePath
  }

  set prevHash(hash) {
    this._prevHash = hash
  }

  set currHash(hash) {
    this._currHash = hash
  }

  createBlock(param) {
    this._currentBlock = new DiffBlock(param)
    this._blocks.push(this._currentBlock)
  }

  addSentence(row) {
    this._currentBlock.addSentence(row)
  }

  render() {
    return (
      `## ${this._filePath}\n\n` +
      `### hash\n\n- \`-${this._prevHash}\`\n- \`+${this._currHash}\`\n\n` +
      this._blocks.map(block => block.render()).join("")
    )
  }
}

class DiffBlock {
  constructor(param) {
    this._sentence = ""
    this._prevRow = (param && param.prevRow) || ""
    this._currRow = (param && param.currRow) || ""
    this._rowInfo = (param && param.rowInfo) || ""
  }

  get sentence() {
    return this._sentence
  }

  addSentence(text) {
    this._sentence = this._sentence ? `${this._sentence}\n${text}` : text
  }

  render() {
    let info = `### row\n\n- \`-${this._prevRow}\`\n- \`+${this._currRow}\`\n\n`
    if (this._rowInfo) {
      info += `### ${this._rowInfo}\n\n`
    }
    return info + '```diff\n' + this._sentence + '\n```\n\n'
  }
}

(() => require('fs').readFile(process.argv[2] || process.stdin.fd, process.argv[3] || "utf8", (error, file) => {
  if (error) throw error
  console.log(new DiffParser().parse(file))
}))()

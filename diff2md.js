const assert = require("assert")
const readFile = require("util").promisify(require('fs').readFile)

class DiffParser {
  constructor() {
    this.defaultEncode = 'utf8'
    this.lineCode = '\n'
    this.headerMatcher = /^diff --git a\/([^ ]+?) b\/([^ ]+?)$/
    this.hashMatcher = /^index [0-9a-z]{8}\.\.[0-9a-z]{8} \d{6}$/
    this.rowMatcher = /^@@ -\d+?,\d+? \+\d+?,\d+? @@.*?$/
    this.filePathMatcher = /^((\+\+\+)|---) (a|b)[^ ]+?$/
  }

  async parse(filePath, encode = this.defaultEncode) {
    const rows = (await readFile(filePath, encode)).split(this.lineCode)
    return `# ${filePath}\n\n`
      + this.classify(rows).map(diffFile => diffFile.render()).join('').trim()
  }

  classify(rows) {
    const blocks = []
    let block
    rows.forEach(row => {
      if (!row || this.isFilePath(row)) return
      if (this.isHeader(row)) {
        if (block) blocks.push(block)
        block = new DiffFile()
        block.filePath = this.pickFilePathInHeader(row)
        return
      }
      assert(block)
      if (this.isHash(row)) {
        block.hash = row
      } else if (this.isModifyRow(row)) {
        block.modifyRow = row
      } else {
        block.add(row)
      }
    });
    if (block) blocks.push(block)
    return blocks
  }

  isHeader(row) {
    return this.headerMatcher.test(row)
  }

  isHash(row) {
    return this.hashMatcher.test(row)
  }

  isModifyRow(row) {
    return this.rowMatcher.test(row)
  }

  isFilePath(row) {
    return this.filePathMatcher.test(row)
  }

  pickFilePathInHeader(header) {
    // TODO: 新規ファイルに対応していない
    const matches = header.match(this.headerMatcher)
    if (!matches) throw Error("this is not header row")
    if (matches[1] !== matches[2]) throw Error("header file name is not match")
    return matches[1]
  }
}

class DiffFile {
  constructor() {
    this._filePath = ''
    this._blocks = []
    this._hash = ''
  }

  set filePath(filePath) {
    this._filePath = filePath
  }

  set hash(hash) {
    this._hash = hash
  }

  set modifyRow(row) {
    this._blocks.push({ row: row, sentense: "" })
  }

  get lastBlock() {
    return this._blocks[this._blocks.length - 1]
  }

  add(row) {
    let last = this.lastBlock.sentense = this.lastBlock.sentense
      ? `${this.lastBlock.sentense}\n${row}`
      : row
  }

  render() {
    return `## ${this._filePath}\n\n- ${this._hash}\n\n${this.renderBlock()}`
  }

  renderBlock() {
    return this._blocks
      .map(block => '### ' + block.row + '\n\n'
        + '```diff\n' + block.sentense + '\n```\n\n')
      .join('')
  }
}

new DiffParser()
  .parse(process.argv[2], process.argv[3])
  .then(result => console.log(result))

const RowOf = {
  empty: Symbol(),
  filePath: Symbol('^((\\+\\+\\+)|---) (a|b)[^ ]+?$'),
  deletedPath: Symbol('^\\+\\+\\+ /dev/null$'),
  newFilePath: Symbol('^--- \\/dev\\/null$'),
  header: Symbol('^diff --git a\\/([^ ]+?) b\\/([^ ]+?)$'),
  newFile: Symbol('^new file mode \\d+$'),
  hash: Symbol('^index ([0-9a-z]{7,8})\\.\\.([0-9a-z]{7,8})( \\d{6})?$'),
  modify: Symbol('^@@ -(\\d+?,\\d+?) \\+(\\d+?,\\d+?) @@ ?(.*?)$'),
  sentence: Symbol(),
  similarity: Symbol('similarity index \\d+%$'),
  rename: Symbol('^rename (from|to) .+$'),
  deletedFile: Symbol('^deleted file mode \\d+$'),
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
        case RowOf.newFilePath:
        case RowOf.similarity:
        case RowOf.rename:
        case RowOf.deletedFile:
        case RowOf.deletedPath:
          return
        case RowOf.newFile:
          diff.isNewFile = true
          return
        case RowOf.header:
          if (diff) diffs.push(diff)
          diff = new DiffFile()
          diff.filePath = this.pickFilePathInHeader(row)
          return
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
    if (!matches) throw Error('this is not hash row')
    return {prevHash: matches[1], currHash: matches[2]}
  }

  parseRow(row) {
    const matches = row.match(this.getDescription('modify'))
    if (!matches) throw Error('this is not row row')
    return {prevRow: matches[1], currRow: matches[2], rowInfo: matches[3]}
  }

  pickFilePathInHeader(header) {
    const matches = header.match(this.getDescription('header'))
    if (!matches) throw Error('this is not header row')
    return matches[1] !== matches[2]
      ? matches[1]
      : matches[1] + " and " + matches[2]
  }
}

class DiffFile {
  constructor() {
    this._fileExtension = ''
    this._filePath = ''
    this._prevHash = ''
    this._currHash = ''
    this._blocks = []
    this._currentBlock
    this._isNewFile = false
  }

  set isNewFile(bool) {
    this._isNewFile = bool
  }

  set filePath(filePath) {
    this._filePath = filePath
    this._fileExtension = filePath.includes('.')
      ? filePath.split('.').slice(-1)[0]
      : ''
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
    if (this._currentBlock) {
      this._currentBlock.addSentence(row)
    } else {
      console.log(row)
      throw Error("block is not defined");
    }

  }

  render() {
    if (this._isNewFile) {
      return (
        `## ${this._filePath}\n\n` +
        `### hash\n\n \`+${this._currHash}\`\n\n` +
        this._blocks.map(block => block.renderForNewFile(this._fileExtension)).join('')
      )
    } else {
      return (
        `## ${this._filePath}\n\n` +
        `### hash\n\n- \`-${this._prevHash}\`\n- \`+${this._currHash}\`\n\n` +
        this._blocks.map(block => block.render()).join('')
      )
    }
  }
}

class DiffBlock {
  constructor(param) {
    this._sentence = ''
    this._prevRow = (param && param.prevRow) || ''
    this._currRow = (param && param.currRow) || ''
    this._rowInfo = (param && param.rowInfo) || ''
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

  renderForNewFile(extension) {
    const sentence = this._sentence.replace(/^\+/, '').replace(/(\n)\+/g, '$1')
    return '```' + extension + '\n' + sentence + '\n```\n\n'
  }
}

(() => require('fs').readFile(process.argv[2] || process.stdin.fd, process.argv[3] || 'utf8', (error, file) => {
  if (error) throw Error(error)
  if (file.length > 60000 && !process.argv[2]) {
    throw Error('60000文字以上はパイプでは動きません。ファイル読み込みにしてください')
  }
  console.log(new DiffParser().parse(file))
}))()

  newFilePath: Symbol('^--- \\/dev\\/null$'),
  hash: Symbol('^index ([0-9a-z]{7,8})\\.\\.([0-9a-z]{7,8})( \\d{6})?$'),
        case RowOf.newFilePath:
          return
        case RowOf.newFile:
          diff.isNewFile = true
    if (!matches) throw Error('this is not hash row')
    if (!matches) throw Error('this is not row row')
    if (!matches) throw Error('this is not header row')
    if (matches[1] !== matches[2]) throw Error('header file name is not match')
    this._fileExtension = ''
    this._filePath = ''
    this._prevHash = ''
    this._currHash = ''
    this._isNewFile = false
  }

  set isNewFile(bool) {
    this._isNewFile = bool
    this._fileExtension = filePath.includes('.')
      ? filePath.split('.').slice(-1)[0]
      : ''
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
    this._sentence = ''
    this._prevRow = (param && param.prevRow) || ''
    this._currRow = (param && param.currRow) || ''
    this._rowInfo = (param && param.rowInfo) || ''

  renderForNewFile(extension) {
    const sentence = this._sentence.replace(/^\+/, '').replace(/(\n)\+/g, '$1')
    return '```' + extension + '\n' + sentence + '\n```\n\n'
  }
(() => require('fs').readFile(process.argv[2] || process.stdin.fd, process.argv[3] || 'utf8', (error, file) => {
  if (error) throw Error(error)
  if (file.length > 60000 && !process.argv[2]) {
    throw Error('60000文字以上はパイプでは、動きません。ファイル読み込みにしてください')
  }
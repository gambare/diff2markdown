  deletedPath: Symbol('^\\+\\+\\+ /dev/null$'),
  modify: Symbol('^@@ -(\\d+?,\\d+?) \\+(\\d+?,\\d+?) @@ ?(.*?)$'),
  similarity: Symbol('similarity index \\d+%$'),
  rename: Symbol('^rename (from|to) .+$'),
  deletedFile: Symbol('^deleted file mode \\d+$'),
        case RowOf.similarity:
        case RowOf.rename:
        case RowOf.deletedFile:
        case RowOf.deletedPath:
    return matches[1] !== matches[2]
      ? matches[1]
      : matches[1] + " and " + matches[2]
    if (this._currentBlock) {
      this._currentBlock.addSentence(row)
    } else {
      console.log(row)
      throw Error("block is not defined");
    }

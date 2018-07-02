import Declaration from './declaration'
import tokenizer from './tokenize'
import Comment from './comment'
import AtRule from './at-rule'
import Root from './root'
import Rule from './rule'
import TOKEN_TYPES_ENUM from './token-types'

export default class Parser {
  constructor (input) {
    this.input = input

    this.root = new Root()
    this.current = this.root
    this.spaces = ''
    this.semicolon = false

    this.createTokenizer()
    this.root.source = { input, start: { line: 1, column: 1 } }
  }

  createTokenizer () {
    this.tokenizer = tokenizer(this.input)
  }

  getTokenContent (token) {
    return this.input.css.slice(token[1], token[2])
  }

  getTokenContentFromArray (tokenArray, index) {
    return this.input.css.slice(tokenArray[index][1], tokenArray[index][2])
  }

  parse () {
    let token
    while (!this.tokenizer.endOfFile()) {
      token = this.tokenizer.nextToken().slice(0)
      switch (token[0]) {
        case TOKEN_TYPES_ENUM.space:
          this.spaces += this.getTokenContent(token)
          break
        case TOKEN_TYPES_ENUM[';']:
          this.freeSemicolon()
          break
        case TOKEN_TYPES_ENUM['}']:
          this.end(token)
          break
        case TOKEN_TYPES_ENUM.comment:
          this.comment(token, this.getTokenContent(token))
          break
        case TOKEN_TYPES_ENUM['at-word']:
          this.atrule(token, this.getTokenContent(token))
          break
        case TOKEN_TYPES_ENUM['{']:
          this.emptyRule(token)
          break
        default:
          this.other(token, this.getTokenContent(token))
          break
      }
    }
    this.endFile()
  }

  comment (token, content) {
    const node = new Comment()
    this.init(node, token[3], token[4])
    node.source.end = { line: token[5], column: token[6] }

    const text = content.slice(2, -2)
    if (/^\s*$/.test(text)) {
      node.text = ''
      node.raws.left = text
      node.raws.right = ''
    } else {
      const match = text.match(/^(\s*)([^]*[^\s])(\s*)$/)
      node.text = match[2]
      node.raws.left = match[1]
      node.raws.right = match[3]
    }
  }

  emptyRule (token) {
    const node = new Rule()
    this.init(node, token[3], token[4])
    node.selector = ''
    node.raws.between = ''
    this.current = node
  }

  other (start) {
    let end = false
    let type = null
    let colon = false
    let bracket = null
    const brackets = []

    const tokens = []
    let token = start
    while (token) {
      type = token[0]
      tokens.push(token)

      if (type === TOKEN_TYPES_ENUM['('] || type === TOKEN_TYPES_ENUM['[']) {
        if (!bracket) bracket = token
        const openP = TOKEN_TYPES_ENUM['(']
        const closeP = TOKEN_TYPES_ENUM[')']
        const closeS = TOKEN_TYPES_ENUM[']']
        brackets.push(type === openP ? closeP : closeS)
      } else if (brackets.length === 0) {
        if (type === TOKEN_TYPES_ENUM[';']) {
          if (colon) {
            this.decl(tokens)
            return
          } else {
            break
          }
        } else if (type === TOKEN_TYPES_ENUM['{']) {
          this.rule(tokens)
          return
        } else if (type === TOKEN_TYPES_ENUM['}']) {
          this.tokenizer.back(tokens.pop())
          end = true
          break
        } else if (type === TOKEN_TYPES_ENUM[':']) {
          colon = true
        }
      } else if (type === brackets[brackets.length - 1]) {
        brackets.pop()
        if (brackets.length === 0) bracket = null
      }

      token = this.tokenizer.nextToken()
    }

    if (this.tokenizer.endOfFile()) end = true
    if (brackets.length > 0) this.unclosedBracket(bracket)

    if (end && colon) {
      while (tokens.length) {
        token = tokens[tokens.length - 1][0]
        if (token !== TOKEN_TYPES_ENUM.space &&
          token !== TOKEN_TYPES_ENUM.comment) break
        this.tokenizer.back(tokens.pop())
      }
      this.decl(tokens)
    } else {
      this.unknownWord(tokens)
    }
  }

  rule (tokens) {
    tokens.pop()

    const node = new Rule()
    this.init(node, tokens[0][3], tokens[0][4])

    node.raws.between = this.spacesAndCommentsFromEnd(tokens)
    this.raw(node, 'selector', tokens)
    this.current = node
  }

  decl (tokens) {
    const node = new Declaration()
    this.init(node)

    const last = tokens[tokens.length - 1]
    if (last[0] === TOKEN_TYPES_ENUM[';']) {
      this.semicolon = true
      tokens.pop()
    }
    if (last[5]) {
      node.source.end = { line: last[5], column: last[6] }
    } else {
      node.source.end = { line: last[3], column: last[4] }
    }

    while (tokens[0][0] !== TOKEN_TYPES_ENUM.word) {
      if (tokens.length === 1) this.unknownWord(tokens)
      node.raws.before += this.getTokenContentFromArray(tokens, 0)
      tokens.shift()
    }
    node.source.start = { line: tokens[0][3], column: tokens[0][4] }

    node.prop = ''
    while (tokens.length) {
      const type = tokens[0][0]
      if (type === TOKEN_TYPES_ENUM[':'] ||
        type === TOKEN_TYPES_ENUM.space ||
        type === TOKEN_TYPES_ENUM.comment) {
        break
      }
      node.prop += this.getTokenContentFromArray(tokens, 0)
      tokens.shift()
    }

    node.raws.between = ''

    let token, content
    while (tokens.length) {
      token = tokens.shift()
      content = this.getTokenContent(token)
      if (token[0] === TOKEN_TYPES_ENUM[':']) {
        node.raws.between += content
        break
      } else {
        node.raws.between += content
      }
    }

    if (node.prop[0] === '_' || node.prop[0] === '*') {
      node.raws.before += node.prop[0]
      node.prop = node.prop.slice(1)
    }
    node.raws.between += this.spacesAndCommentsFromStart(tokens)
    this.precheckMissedSemicolon(tokens)

    for (let i = tokens.length - 1; i > 0; i--) {
      token = tokens[i]
      if (this.getTokenContent(token).toLowerCase() === '!important') {
        node.important = true
        let string = this.stringFrom(tokens, i)
        string = this.spacesFromEnd(tokens) + string
        if (string !== ' !important') node.raws.important = string
        break
      } else if (this.getTokenContent(token).toLowerCase() === 'important') {
        const cache = tokens.slice(0)
        let str = ''
        for (let j = i; j > 0; j--) {
          const type = cache[j][0]
          if (str.trim().indexOf('!') === 0 &&
            type !== TOKEN_TYPES_ENUM.space) {
            break
          }
          str = this.getTokenContentFromArray(cache, cache.length - 1) + str
          cache.pop()
        }
        if (str.trim().indexOf('!') === 0) {
          node.important = true
          node.raws.important = str
          tokens = cache
        }
      }

      if (token[0] !== TOKEN_TYPES_ENUM.space &&
        token[0] !== TOKEN_TYPES_ENUM.comment) {
        break
      }
    }

    this.raw(node, 'value', tokens)

    if (node.value.indexOf(':') !== -1) this.checkMissedSemicolon(tokens)
  }

  atrule (token, content) {
    const node = new AtRule()
    node.name = content.slice(1)
    if (node.name === '') {
      this.unnamedAtrule(node, token)
    }
    this.init(node, token[3], token[4])

    let prev
    let shift
    let last = false
    let open = false
    const params = []

    while (!this.tokenizer.endOfFile()) {
      token = this.tokenizer.nextToken()

      if (token[0] === TOKEN_TYPES_ENUM[';']) {
        node.source.end = { line: token[3], column: token[4] }
        this.semicolon = true
        break
      } else if (token[0] === TOKEN_TYPES_ENUM['{']) {
        open = true
        break
      } else if (token[0] === TOKEN_TYPES_ENUM['}']) {
        if (params.length > 0) {
          shift = params.length - 1
          prev = params[shift]
          while (prev && prev[0] === TOKEN_TYPES_ENUM.space) {
            prev = params[--shift]
          }
          if (prev) {
            node.source.end = { line: prev[5], column: prev[6] }
          }
        }
        this.end(token)
        break
      } else {
        params.push(token)
      }

      if (this.tokenizer.endOfFile()) {
        last = true
        break
      }
    }

    node.raws.between = this.spacesAndCommentsFromEnd(params)
    if (params.length) {
      node.raws.afterName = this.spacesAndCommentsFromStart(params)
      this.raw(node, 'params', params)
      if (last) {
        token = params[params.length - 1]
        node.source.end = { line: token[5], column: token[6] }
        this.spaces = node.raws.between
        node.raws.between = ''
      }
    } else {
      node.raws.afterName = ''
      node.params = ''
    }

    if (open) {
      node.nodes = []
      this.current = node
    }
  }

  end (token) {
    if (this.current.nodes && this.current.nodes.length) {
      this.current.raws.semicolon = this.semicolon
    }
    this.semicolon = false

    this.current.raws.after = (this.current.raws.after || '') + this.spaces
    this.spaces = ''

    if (this.current.parent) {
      this.current.source.end = { line: token[3], column: token[4] }
      this.current = this.current.parent
    } else {
      this.unexpectedClose(token)
    }
  }

  endFile () {
    if (this.current.parent) this.unclosedBlock()
    if (this.current.nodes && this.current.nodes.length) {
      this.current.raws.semicolon = this.semicolon
    }
    this.current.raws.after = (this.current.raws.after || '') + this.spaces
  }

  freeSemicolon () {
    this.spaces += ';'
    if (this.current.nodes) {
      const prev = this.current.nodes[this.current.nodes.length - 1]
      if (prev && prev.type === 'rule' && !prev.raws.ownSemicolon) {
        prev.raws.ownSemicolon = this.spaces
        this.spaces = ''
      }
    }
  }

  // Helpers

  init (node, line, column) {
    this.current.push(node)

    node.source = { start: { line, column }, input: this.input }
    node.raws.before = this.spaces
    this.spaces = ''
    if (node.type !== 'comment') this.semicolon = false
  }

  raw (node, prop, tokens) {
    let token, type
    const length = tokens.length
    let value = ''
    let clean = true
    let next, prev
    const pattern = /^([.|#])?([\w])+/i

    for (let i = 0; i < length; i += 1) {
      token = tokens[i]
      type = token[0]

      if (type === TOKEN_TYPES_ENUM.comment && node.type === 'rule') {
        prev = tokens[i - 1]
        next = tokens[i + 1]

        if (
          prev[0] !== TOKEN_TYPES_ENUM.space &&
          next[0] !== TOKEN_TYPES_ENUM.space &&
          pattern.test(this.getTokenContent(prev)) &&
          pattern.test(this.getTokenContent(next))
        ) {
          value += this.getTokenContent(token)
        } else {
          clean = false
        }

        continue
      }

      if (type === TOKEN_TYPES_ENUM.comment ||
        (type === TOKEN_TYPES_ENUM.space && i === length - 1)) {
        clean = false
      } else {
        value += this.getTokenContent(token)
      }
    }
    if (!clean) {
      const raw = tokens.reduce((all, i) => all + this.getTokenContent(i), '')
      node.raws[prop] = { value, raw }
    }
    node[prop] = value
  }

  spacesAndCommentsFromEnd (tokens) {
    let lastTokenType
    let spaces = ''
    while (tokens.length) {
      lastTokenType = tokens[tokens.length - 1][0]
      if (lastTokenType !== TOKEN_TYPES_ENUM.space &&
        lastTokenType !== TOKEN_TYPES_ENUM.comment) break
      spaces = this.getTokenContentFromArray(tokens, tokens.length - 1) + spaces
      tokens.pop()
    }
    return spaces
  }

  spacesAndCommentsFromStart (tokens) {
    let next
    let spaces = ''
    while (tokens.length) {
      next = tokens[0][0]
      if (next !== TOKEN_TYPES_ENUM.space &&
        next !== TOKEN_TYPES_ENUM.comment) break
      spaces += this.getTokenContentFromArray(tokens, 0)
      tokens.shift()
    }
    return spaces
  }

  spacesFromEnd (tokens) {
    let lastTokenType
    let spaces = ''
    while (tokens.length) {
      lastTokenType = tokens[tokens.length - 1][0]
      if (lastTokenType !== TOKEN_TYPES_ENUM.space) break
      spaces = this.getTokenContentFromArray(tokens, tokens.length - 1)
      tokens.pop()
    }
    return spaces
  }

  stringFrom (tokens, from) {
    let result = ''
    for (let i = from; i < tokens.length; i++) {
      result += this.getTokenContentFromArray(tokens, i)
    }
    tokens.splice(from, tokens.length - from)
    return result
  }

  colon (tokens) {
    let brackets = 0
    let token, type, prev
    for (let i = 0; i < tokens.length; i++) {
      token = tokens[i]
      type = token[0]

      if (type === TOKEN_TYPES_ENUM['(']) {
        brackets += 1
      } else if (type === TOKEN_TYPES_ENUM[')']) {
        brackets -= 1
      } else if (brackets === 0 && type === TOKEN_TYPES_ENUM[':']) {
        if (!prev) {
          this.doubleColon(token)
        } else if (prev[0] === TOKEN_TYPES_ENUM.word &&
          this.getTokenContent(prev) === 'progid') {
          continue
        } else {
          return i
        }
      }

      prev = token
    }
    return false
  }

  // Errors

  unclosedBracket (bracket) {
    throw this.input.error('Unclosed bracket', bracket[3], bracket[4])
  }

  unknownWord (tokens) {
    throw this.input.error('Unknown word', tokens[0][3], tokens[0][4])
  }

  unexpectedClose (token) {
    throw this.input.error('Unexpected }', token[3], token[4])
  }

  unclosedBlock () {
    const pos = this.current.source.start
    throw this.input.error('Unclosed block', pos.line, pos.column)
  }

  doubleColon (token) {
    throw this.input.error('Double colon', token[3], token[4])
  }

  unnamedAtrule (node, token) {
    throw this.input.error('At-rule without name', token[3], token[4])
  }

  precheckMissedSemicolon (/* tokens */) {
    // Hook for Safe Parser
  }

  checkMissedSemicolon (tokens) {
    const colon = this.colon(tokens)
    if (colon === false) return

    let founded = 0
    let token
    for (let j = colon - 1; j >= 0; j--) {
      token = tokens[j]
      if (token[0] !== TOKEN_TYPES_ENUM.space) {
        founded += 1
        if (founded === 2) break
      }
    }
    throw this.input.error('Missed semicolon', token[3], token[4])
  }
}

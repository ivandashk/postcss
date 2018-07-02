const tokenizer = require('../lib/tokenize')
const Input = require('../lib/input')

function tokenize (css, opts) {
  const processor = tokenizer(new Input(css), opts)
  const tokens = []
  while (!processor.endOfFile()) {
    tokens.push(processor.nextToken().slice(0))
  }
  return tokens
}

function run (css, tokens, opts) {
  expect(tokenize(css, opts)).toEqual(tokens)
}

it('tokenizes empty file', () => {
  run('', [])
})

it('tokenizes space', () => {
  run('\r\n \f\t', [new Uint32Array([0, 0, 0, 0, 0])])
})

it('tokenizes word', () => {
  run('ab', [
    new Uint32Array([1, 1, 1, 1, 2])
  ])
})

it('splits word by !', () => {
  run('aa!bb', [
    new Uint32Array([1, 1, 1, 1, 2]),
    new Uint32Array([1, 1, 3, 1, 5])
  ])
})

it('changes lines in spaces', () => {
  run('a \n b', [
    new Uint32Array([1, 1, 1, 1, 1]),
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([1, 2, 2, 2, 2])
  ])
})

it('tokenizes control chars', () => {
  run('{:;}', [
    new Uint32Array([10, 1, 1, 0, 0]),
    new Uint32Array([12, 1, 2, 0, 0]),
    new Uint32Array([13, 1, 3, 0, 0]),
    new Uint32Array([11, 1, 4, 0, 0])
  ])
})

it('escapes control symbols', () => {
  run('\\(\\{\\"\\@\\\\""', [
    new Uint32Array([1, 1, 1, 1, 2]),
    new Uint32Array([1, 1, 3, 1, 4]),
    new Uint32Array([1, 1, 5, 1, 6]),
    new Uint32Array([1, 1, 7, 1, 8]),
    new Uint32Array([1, 1, 9, 1, 10]),
    new Uint32Array([2, 1, 11, 1, 12])
  ])
})

it('escapes backslash', () => {
  run('\\\\\\\\{', [
    new Uint32Array([1, 1, 1, 1, 4]),
    new Uint32Array([10, 1, 5, 0, 0])
  ])
})

it('tokenizes simple brackets', () => {
  run('(ab)', [
    new Uint32Array([4, 1, 1, 1, 4])
  ])
})

it('tokenizes square brackets', () => {
  run('a[bc]', [
    new Uint32Array([1, 1, 1, 1, 1]),
    new Uint32Array([8, 1, 2, 0, 0]),
    new Uint32Array([1, 1, 3, 1, 4]),
    new Uint32Array([9, 1, 5, 0, 0])
  ])
})

it('tokenizes complicated brackets', () => {
  run('(())("")(/**/)(\\\\)(\n)(', [
    new Uint32Array([6, 1, 1, 0, 0]),
    new Uint32Array([4, 1, 2, 1, 3]),
    new Uint32Array([7, 1, 4, 0, 0]),
    new Uint32Array([6, 1, 5, 0, 0]),
    new Uint32Array([2, 1, 6, 1, 7]),
    new Uint32Array([7, 1, 8, 0, 0]),
    new Uint32Array([6, 1, 9, 0, 0]),
    new Uint32Array([3, 1, 10, 1, 13]),
    new Uint32Array([7, 1, 14, 0, 0]),
    new Uint32Array([6, 1, 15, 0, 0]),
    new Uint32Array([1, 1, 16, 1, 17]),
    new Uint32Array([7, 1, 18, 0, 0]),
    new Uint32Array([6, 1, 19, 0, 0]),
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([7, 2, 1, 0, 0]),
    new Uint32Array([6, 2, 2, 0, 0])
  ])
})

it('tokenizes string', () => {
  run('\'"\'"\\""', [
    new Uint32Array([2, 1, 1, 1, 3]),
    new Uint32Array([2, 1, 4, 1, 7])
  ])
})

it('tokenizes escaped string', () => {
  run('"\\\\"', [
    new Uint32Array([2, 1, 1, 1, 4])
  ])
})

it('changes lines in strings', () => {
  run('"\n\n""\n\n"', [
    new Uint32Array([2, 1, 1, 3, 1]),
    new Uint32Array([2, 3, 2, 5, 1])
  ])
})

it('tokenizes at-word', () => {
  run('@word ', [
    new Uint32Array([5, 1, 1, 1, 5]),
    new Uint32Array([0, 0, 0, 0, 0])
  ])
})

it('tokenizes at-word end', () => {
  run('@one{@two()@three""@four;', [
    new Uint32Array([5, 1, 1, 1, 4]),
    new Uint32Array([10, 1, 5, 0, 0]),
    new Uint32Array([5, 1, 6, 1, 9]),
    new Uint32Array([4, 1, 10, 1, 11]),
    new Uint32Array([5, 1, 12, 1, 17]),
    new Uint32Array([2, 1, 18, 1, 19]),
    new Uint32Array([5, 1, 20, 1, 24]),
    new Uint32Array([13, 1, 25, 0, 0])
  ])
})

it('tokenizes urls', () => {
  run('url(/*\\))', [
    new Uint32Array([1, 1, 1, 1, 3]),
    new Uint32Array([4, 1, 4, 1, 9])
  ])
})

it('tokenizes quoted urls', () => {
  run('url(")")', [
    new Uint32Array([1, 1, 1, 1, 3]),
    new Uint32Array([6, 1, 4, 0, 0]),
    new Uint32Array([2, 1, 5, 1, 7]),
    new Uint32Array([7, 1, 8, 0, 0])
  ])
})

it('tokenizes at-symbol', () => {
  run('@', [
    new Uint32Array([5, 1, 1, 1, 1])
  ])
})

it('tokenizes comment', () => {
  run('/* a\nb */', [
    new Uint32Array([3, 1, 1, 2, 4])
  ])
})

it('changes lines in comments', () => {
  run('a/* \n */b', [
    new Uint32Array([1, 1, 1, 1, 1]),
    new Uint32Array([3, 1, 2, 2, 3]),
    new Uint32Array([1, 2, 4, 2, 4])
  ])
})

it('supports line feed', () => {
  run('a\fb', [
    new Uint32Array([1, 1, 1, 1, 1]),
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([1, 2, 1, 2, 1])
  ])
})

it('supports carriage return', () => {
  run('a\rb\r\nc', [
    new Uint32Array([1, 1, 1, 1, 1]),
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([1, 2, 1, 2, 1]),
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([1, 3, 1, 3, 1])
  ])
})

it('tokenizes CSS', () => {
  const css = 'a {\n' +
              '  content: "a";\n' +
              '  width: calc(1px;)\n' +
              '  }\n' +
              '/* small screen */\n' +
              '@media screen {}'
  run(css, [
    new Uint32Array([1, 1, 1, 1, 1]),
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([10, 1, 3, 0, 0]),
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([1, 2, 3, 2, 9]),
    new Uint32Array([12, 2, 10, 0, 0]),
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([2, 2, 12, 2, 14]),
    new Uint32Array([13, 2, 15, 0, 0]),
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([1, 3, 3, 3, 7]),
    new Uint32Array([12, 3, 8, 0, 0]),
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([1, 3, 10, 3, 13]),
    new Uint32Array([4, 3, 14, 3, 19]),
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([11, 4, 3, 0, 0]),
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([3, 5, 1, 5, 18]),
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([5, 6, 1, 6, 6]),
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([1, 6, 8, 6, 13]),
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([10, 6, 15, 0, 0]),
    new Uint32Array([11, 6, 16, 0, 0])
  ])
})

it('throws error on unclosed string', () => {
  expect(() => {
    tokenize(' "')
  }).toThrowError(/:1:2: Unclosed string/)
})

it('throws error on unclosed comment', () => {
  expect(() => {
    tokenize(' /*')
  }).toThrowError(/:1:2: Unclosed comment/)
})

it('throws error on unclosed url', () => {
  expect(() => {
    tokenize('url(')
  }).toThrowError(/:1:4: Unclosed bracket/)
})

it('ignores unclosing string on request', () => {
  run(' "', [
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([2, 1, 2, 1, 3])
  ], { ignoreErrors: true })
})

it('ignores unclosing comment on request', () => {
  run(' /*', [
    new Uint32Array([0, 0, 0, 0, 0]),
    new Uint32Array([3, 1, 2, 1, 4])
  ], { ignoreErrors: true })
})

it('ignores unclosing function on request', () => {
  run('url(', [
    new Uint32Array([1, 1, 1, 1, 3]),
    new Uint32Array([4, 1, 4, 1, 4])
  ], { ignoreErrors: true })
})

it('tokenizes hexadecimal escape', () => {
  run('\\0a \\09 \\z ', [
    new Uint32Array([1, 1, 1, 1, 4]),
    new Uint32Array([1, 1, 5, 1, 8]),
    new Uint32Array([1, 1, 9, 1, 10]),
    new Uint32Array([0, 0, 0, 0, 0])
  ])
})

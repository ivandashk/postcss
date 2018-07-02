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
  run('\r\n \f\t', [new Uint32Array([1, 0, 5, 0, 0, 0, 0])])
})

it('tokenizes word', () => {
  run('ab', [
    new Uint32Array([2, 0, 2, 1, 1, 1, 2])
  ])
})

it('splits word by !', () => {
  run('aa!bb', [
    new Uint32Array([2, 0, 2, 1, 1, 1, 2]),
    new Uint32Array([2, 2, 5, 1, 3, 1, 5])
  ])
})

it('changes lines in spaces', () => {
  run('a \n b', [
    new Uint32Array([2, 0, 1, 1, 1, 1, 1]),
    new Uint32Array([1, 1, 4, 0, 0, 0, 0]),
    new Uint32Array([2, 4, 5, 2, 2, 2, 2])
  ])
})

it('tokenizes control chars', () => {
  run('{:;}', [
    new Uint32Array([11, 0, 1, 1, 1, 0, 0]),
    new Uint32Array([13, 1, 2, 1, 2, 0, 0]),
    new Uint32Array([14, 2, 3, 1, 3, 0, 0]),
    new Uint32Array([12, 3, 4, 1, 4, 0, 0])
  ])
})

it('escapes control symbols', () => {
  run('\\(\\{\\"\\@\\\\""', [
    new Uint32Array([2, 0, 2, 1, 1, 1, 2]),
    new Uint32Array([2, 2, 4, 1, 3, 1, 4]),
    new Uint32Array([2, 4, 6, 1, 5, 1, 6]),
    new Uint32Array([2, 6, 8, 1, 7, 1, 8]),
    new Uint32Array([2, 8, 10, 1, 9, 1, 10]),
    new Uint32Array([3, 10, 12, 1, 11, 1, 12])
  ])
})

it('escapes backslash', () => {
  run('\\\\\\\\{', [
    new Uint32Array([2, 0, 4, 1, 1, 1, 4]),
    new Uint32Array([11, 4, 5, 1, 5, 0, 0])
  ])
})

it('tokenizes simple brackets', () => {
  run('(ab)', [
    new Uint32Array([5, 0, 4, 1, 1, 1, 4])
  ])
})

it('tokenizes square brackets', () => {
  run('a[bc]', [
    new Uint32Array([2, 0, 1, 1, 1, 1, 1]),
    new Uint32Array([9, 1, 2, 1, 2, 0, 0]),
    new Uint32Array([2, 2, 4, 1, 3, 1, 4]),
    new Uint32Array([10, 4, 5, 1, 5, 0, 0])
  ])
})

it('tokenizes complicated brackets', () => {
  run('(())("")(/**/)(\\\\)(\n)(', [
    new Uint32Array([7, 0, 1, 1, 1, 0, 0]),
    new Uint32Array([5, 1, 3, 1, 2, 1, 3]),
    new Uint32Array([8, 3, 4, 1, 4, 0, 0]),
    new Uint32Array([7, 4, 5, 1, 5, 0, 0]),
    new Uint32Array([3, 5, 7, 1, 6, 1, 7]),
    new Uint32Array([8, 7, 8, 1, 8, 0, 0]),
    new Uint32Array([7, 8, 9, 1, 9, 0, 0]),
    new Uint32Array([4, 9, 13, 1, 10, 1, 13]),
    new Uint32Array([8, 13, 14, 1, 14, 0, 0]),
    new Uint32Array([7, 14, 15, 1, 15, 0, 0]),
    new Uint32Array([2, 15, 17, 1, 16, 1, 17]),
    new Uint32Array([8, 17, 18, 1, 18, 0, 0]),
    new Uint32Array([7, 18, 19, 1, 19, 0, 0]),
    new Uint32Array([1, 19, 20, 0, 0, 0, 0]),
    new Uint32Array([8, 20, 21, 2, 1, 0, 0]),
    new Uint32Array([7, 21, 22, 2, 2, 0, 0])
  ])
})

it('tokenizes string', () => {
  run('\'"\'"\\""', [
    new Uint32Array([3, 0, 3, 1, 1, 1, 3]),
    new Uint32Array([3, 3, 7, 1, 4, 1, 7])
  ])
})

it('tokenizes escaped string', () => {
  run('"\\\\"', [
    new Uint32Array([3, 0, 4, 1, 1, 1, 4])
  ])
})

it('changes lines in strings', () => {
  run('"\n\n""\n\n"', [
    new Uint32Array([3, 0, 4, 1, 1, 3, 1]),
    new Uint32Array([3, 4, 8, 3, 2, 5, 1])
  ])
})

it('tokenizes at-word', () => {
  run('@word ', [
    new Uint32Array([6, 0, 5, 1, 1, 1, 5]),
    new Uint32Array([1, 5, 6, 0, 0, 0, 0])
  ])
})

it('tokenizes at-word end', () => {
  run('@one{@two()@three""@four;', [
    new Uint32Array([6, 0, 4, 1, 1, 1, 4]),
    new Uint32Array([11, 4, 5, 1, 5, 0, 0]),
    new Uint32Array([6, 5, 9, 1, 6, 1, 9]),
    new Uint32Array([5, 9, 11, 1, 10, 1, 11]),
    new Uint32Array([6, 11, 17, 1, 12, 1, 17]),
    new Uint32Array([3, 17, 19, 1, 18, 1, 19]),
    new Uint32Array([6, 19, 24, 1, 20, 1, 24]),
    new Uint32Array([14, 24, 25, 1, 25, 0, 0])
  ])
})

it('tokenizes urls', () => {
  run('url(/*\\))', [
    new Uint32Array([2, 0, 3, 1, 1, 1, 3]),
    new Uint32Array([5, 3, 9, 1, 4, 1, 9])
  ])
})

it('tokenizes quoted urls', () => {
  run('url(")")', [
    new Uint32Array([2, 0, 3, 1, 1, 1, 3]),
    new Uint32Array([7, 3, 4, 1, 4, 0, 0]),
    new Uint32Array([3, 4, 7, 1, 5, 1, 7]),
    new Uint32Array([8, 7, 8, 1, 8, 0, 0])
  ])
})

it('tokenizes at-symbol', () => {
  run('@', [
    new Uint32Array([6, 0, 1, 1, 1, 1, 1])
  ])
})

it('tokenizes comment', () => {
  run('/* a\nb */', [
    new Uint32Array([4, 0, 9, 1, 1, 2, 4])
  ])
})

it('changes lines in comments', () => {
  run('a/* \n */b', [
    new Uint32Array([2, 0, 1, 1, 1, 1, 1]),
    new Uint32Array([4, 1, 8, 1, 2, 2, 3]),
    new Uint32Array([2, 8, 9, 2, 4, 2, 4])
  ])
})

it('supports line feed', () => {
  run('a\fb', [
    new Uint32Array([2, 0, 1, 1, 1, 1, 1]),
    new Uint32Array([1, 1, 2, 0, 0, 0, 0]),
    new Uint32Array([2, 2, 3, 2, 1, 2, 1])
  ])
})

it('supports carriage return', () => {
  run('a\rb\r\nc', [
    new Uint32Array([2, 0, 1, 1, 1, 1, 1]),
    new Uint32Array([1, 1, 2, 0, 0, 0, 0]),
    new Uint32Array([2, 2, 3, 2, 1, 2, 1]),
    new Uint32Array([1, 3, 5, 0, 0, 0, 0]),
    new Uint32Array([2, 5, 6, 3, 1, 3, 1])
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
    new Uint32Array([2, 0, 1, 1, 1, 1, 1]),
    new Uint32Array([1, 1, 2, 0, 0, 0, 0]),
    new Uint32Array([11, 2, 3, 1, 3, 0, 0]),
    new Uint32Array([1, 3, 6, 0, 0, 0, 0]),
    new Uint32Array([2, 6, 13, 2, 3, 2, 9]),
    new Uint32Array([13, 13, 14, 2, 10, 0, 0]),
    new Uint32Array([1, 14, 15, 0, 0, 0, 0]),
    new Uint32Array([3, 15, 18, 2, 12, 2, 14]),
    new Uint32Array([14, 18, 19, 2, 15, 0, 0]),
    new Uint32Array([1, 19, 22, 0, 0, 0, 0]),
    new Uint32Array([2, 22, 27, 3, 3, 3, 7]),
    new Uint32Array([13, 27, 28, 3, 8, 0, 0]),
    new Uint32Array([1, 28, 29, 0, 0, 0, 0]),
    new Uint32Array([2, 29, 33, 3, 10, 3, 13]),
    new Uint32Array([5, 33, 39, 3, 14, 3, 19]),
    new Uint32Array([1, 39, 42, 0, 0, 0, 0]),
    new Uint32Array([12, 42, 43, 4, 3, 0, 0]),
    new Uint32Array([1, 43, 44, 0, 0, 0, 0]),
    new Uint32Array([4, 44, 62, 5, 1, 5, 18]),
    new Uint32Array([1, 62, 63, 0, 0, 0, 0]),
    new Uint32Array([6, 63, 69, 6, 1, 6, 6]),
    new Uint32Array([1, 69, 70, 0, 0, 0, 0]),
    new Uint32Array([2, 70, 76, 6, 8, 6, 13]),
    new Uint32Array([1, 76, 77, 0, 0, 0, 0]),
    new Uint32Array([11, 77, 78, 6, 15, 0, 0]),
    new Uint32Array([12, 78, 79, 6, 16, 0, 0])
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
    new Uint32Array([1, 0, 1, 0, 0, 0, 0]),
    new Uint32Array([3, 1, 2, 1, 2, 1, 3])
  ], { ignoreErrors: true })
})

it('ignores unclosing comment on request', () => {
  run(' /*', [
    new Uint32Array([1, 0, 1, 0, 0, 0, 0]),
    new Uint32Array([4, 1, 3, 1, 2, 1, 4])
  ], { ignoreErrors: true })
})

it('ignores unclosing function on request', () => {
  run('url(', [
    new Uint32Array([2, 0, 3, 1, 1, 1, 3]),
    new Uint32Array([5, 3, 4, 1, 4, 1, 4])
  ], { ignoreErrors: true })
})

it('tokenizes hexadecimal escape', () => {
  run('\\0a \\09 \\z ', [
    new Uint32Array([2, 0, 4, 1, 1, 1, 4]),
    new Uint32Array([2, 4, 8, 1, 5, 1, 8]),
    new Uint32Array([2, 8, 10, 1, 9, 1, 10]),
    new Uint32Array([1, 10, 11, 0, 0, 0, 0])
  ])
})

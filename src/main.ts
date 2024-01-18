function hello (s: string) {
  return s + '12' + p
}

async function hi() {
  return 26
}

async function main(): Promise<boolean> {
  const a = await hi()
  return a < 1
}
main()

const p:number[] = [1, 2, 3]

hello('hi twelve')


interface Point {
  x: number
  y: number
  bar: string
}

function printCoord(pt: Point) {
  console.log("The coordinate's x value is " + pt.x)
  console.log("The coordinate's y value is " + pt.y)
}

printCoord({ x: 3, y: 7, bar: 'ack' })

enum Kotai {
  Hai,
  Nai
}

function test (k: Kotai) {
  console.log('yep', Kotai[k])
}

test(Kotai.Hai)
test(Kotai.Nai)


const lst = [1, 2, 3] as const
console.log(lst[0])
// lst.push(5)  // compile error

function printLst (t: readonly (1|2|3)[]) {
  console.log(t)
}
printLst(lst)


const ODirection = {
  Up: 0,
  Down: 1,
  Left: 2,
  Right: 3,
} as const;
type Direction = (typeof ODirection)[keyof typeof ODirection]
let f:Direction = 3
// type Direction = typeof ODirection[keyof typeof ODirection]

type Dir = {
  readonly Up: 0,
  readonly Down: 1,
  readonly Left: 2,
  readonly Right: 3,
}
type DIR = Dir["Up"|"Down"|"Left"|"Right"]

let g:Dir = { Up:0, Down:1, Left:2, Right:3 }

type Person = { age: number; name: string; alive: boolean };
type I1 = Person["age" | "name"];


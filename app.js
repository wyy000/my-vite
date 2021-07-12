const Koa = require('koa')
const fs = require('fs')
const path = require('path')

const compilerSFC = require('@vue/compiler-sfc')
const compilerDOM = require('@vue/compiler-dom')

const app = new Koa()

app.use(ctx => {
  const {url} = ctx.request

  if (url === '/') {
    ctx.type = 'text/html'
    ctx.body = fs.readFileSync(path.join(__dirname, 'index.html'))
  }
  else if (url.startsWith('/@modules')) {
    const p = url.replace('/@modules', '')
    const prefix = path.join(__dirname, '/node_modules', p)
    const pathName = require(prefix + '/package.json').module
    // change path is resolve path of reading package.json module
    const module = fs.readFileSync(path.join(prefix, pathName), 'utf8')

    ctx.type = 'application/javascript'
    ctx.body = reWriteImport(module)
  }
  else if (url.endsWith('.js')) {
    const p = path.join(__dirname, url)
    const file = fs.readFileSync(p, 'utf8')

    ctx.type = 'application/javascript'
    ctx.body = reWriteImport(file)
  }
  else if (url.indexOf('.vue') > -1) {

    const {query} = ctx
    const pathName = url.split('?')[0]
    const p = path.join(__dirname, pathName)
    const res = compilerSFC.parse(fs.readFileSync(p, 'utf8'))

    // compiler Vue file main of change file is js object, and template is transform render object, so should add render fn in js file
    if (!query.type) {
      const content = res.descriptor.script.content
      const script = content.replace('export default ', 'const __script = ')

      ctx.type = 'application/javascript'
      ctx.body =
        `${reWriteImport(script)}
        import {render as __render} from '${url}?type=template'
        __script.render = __render
        export default __script
        `
    }
    else if (query.type === 'template') {
      const template = res.descriptor.template.content
      const code = compilerDOM.compile(template, {mode: 'module'}).code

      ctx.type = 'application/javascript'
      ctx.body = reWriteImport(code)
    }
  }
})

function reWriteImport (content) {
  return content.replace(/([import|export])\s+(.+?)\s+from\s+(['"])(.+?)\3\n?/g, (str, $1, $2, $3, $4) => {
    if ($4.startsWith('/') || $4.startsWith('./') || $4.startsWith('../')) return str
    else return `${$1} ${$2} from ${$3}/@modules/${$4}${$3}`
  })
}

app.listen(3000, () => console.log('serve startup, listen at 3000'))

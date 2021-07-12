const Koa = require('koa')
const path = require('path')
const fs = require('fs')
const compilerSFC = require('@vue/compiler-sfc')
const compilerDOM = require('@vue/compiler-dom')

const app = new Koa()

app.use(async ctx => {
  const {url, query} = ctx.request
  console.log(url)

  if (url === '/') {
    ctx.type = 'text/html'
    ctx.body = fs.readFileSync('./index.html', 'utf8')
  }
  else if (url.startsWith('/@modules')) {
    const moduleName = url.replace('/@modules', '')
    const prefix = path.join(__dirname, './node_modules', moduleName)
    const module = require(prefix + '/package.json').module
    const pathName = path.join(prefix, module)

    ctx.type = 'application/javascript'
    ctx.body = reWhiteImport(fs.readFileSync(pathName, 'utf8'))
  }
  else if (url.endsWith('.js')) {
    const pathName = path.join(__dirname, url)
    const file = fs.readFileSync(pathName, 'utf8')
    ctx.type = 'application/javascript'
    ctx.body = reWhiteImport(file)
  }
  else if (url.indexOf('.vue') > -1) {
    const file = fs.readFileSync(path.join(__dirname, url.split('?')[0]), 'utf8')
    const res = compilerSFC.parse(file)

    if (!query.type) {
      const content = res.descriptor.script.content
      const script = content.replace('export default ', 'const __script = ')

      ctx.type = 'application/javascript'
      ctx.body = `
        ${reWhiteImport(script)}
        import {render as __render} from '${url}?type=template&lang=js'
        __script.render = __render
        export default __script
      `
      // import '${url}?vue&type=style&scoped=true&lang.css'
    }
    else if (query.type === 'template') {
      const tpl = res.descriptor.template.content
      const code = compilerDOM.compile(tpl, {mode: 'module'}).code

      ctx.type = 'application/javascript'
      ctx.body = reWhiteImport(code)
    }
    // else if (query.type === 'style') {
    //   const style = res.descriptor.styles[0].content
    //   ctx.type = 'text/css'
    //   ctx.body = style
    // }
  }
})

function reWhiteImport (content) {
  return content.replace(/([import|export])\s+(.+?)\s+from\s+(['"])(.+?)\3\s?;?[\n?\s*]/gm, (s1, s2, s3, s4, s5) => {
    if (s5.startsWith('/') || s5.startsWith('./') || s5.startsWith('../')) return s1
    else return `${s2} ${s3} from '/@modules/${s5}'\n`
  })
}

app.listen(8080, () => console.log('serve start, listen at 8080'))

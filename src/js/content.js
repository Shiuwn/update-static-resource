;(function (window, document) {
  function queryAll(selector, dom) {
    return (dom instanceof HTMLElement ? dom : document).querySelectorAll(
      selector
    )
  }
  function toArray(arr) {
    return Array.prototype.slice.call(arr)
  }
  var scripts, links
  var cssSource = []
  var scriptSource = []
  function getAllResource() {
    if (
      scripts &&
      links &&
      (scripts.length ||
        links.length
        )
    ) {
      return {
        cssSource: links.map(function (link) {
          return {
            src: link.href,
            type: 'css',
          }
        }),
        scriptSource: scripts.map(function (script) {
          return {
            src: script.src,
            type: 'script',
          }
        }),
      }
    }

    try {
      scripts = queryAll('script[src]')
      links = queryAll('link[rel="stylesheet"]')
      scripts = toArray(scripts)
      links = toArray(links)
      scriptSource = scripts.map(function (script) {
        return {
          src: script.src,
          type: 'script',
        }
      })
      cssSource = links.map(function (link) {
        return {
          src: link.href,
          type: 'css',
        }
      })
    } catch (e) {
      console.log(e)
    }
    return {
      cssSource: cssSource,
      scriptSource: scriptSource,
    }
  }
  function load(dom, prop) {
    var src = dom[prop]
    var type = prop === 'src' ? 'script' : 'css'
    var reg = /(\?v=.*)$/
    var newSrc = src.replace(reg, '')
    newSrc = newSrc + '?v=' + Math.random().toString(16).slice(2)
    dom[prop] = newSrc
    // return new Promise(function (resolve, reject) {
    //   dom[prop] = newSrc
    //   dom.onload = function () {
    //     resolve({ old: src, new: newSrc, type: type })
    //   }
    //   dom.onerror = function (e) {
    //     reject(e)
    //   }
    // })
    return {old: src, new: newSrc, type: type}
  }
  function updateResource(data) {
    var subScripts = scripts.filter(function (script) {
      return data.indexOf(script.src) > -1
    })
    
    var subCss = links.filter(function (link) {
      return data.indexOf(link.href) > -1
    })
    var queue = []
      .concat(
        subScripts.map(function (dom) {
          return load(dom, 'src')
        })
      )
      .concat(
        subCss.map(function (dom) {
          return load(dom, 'href')
        })
      )
    // Promise.all(queue).then(function(data){
    //   // chrome.runtime.sendMessage({type: 'resource', data: data}, function(response) {
    //   //   if(!response) console.error('no response')
    //   // })
    //   console.log(data)
    // })
    return queue
  }

  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    var resource;
    if (request.type === 'getAllResource') {
      resource = getAllResource()
      sendResponse(resource)
    } else if (request.type === 'updateResource') {
      sendResponse(updateResource(request.data))
    }
  })
})(window, document)

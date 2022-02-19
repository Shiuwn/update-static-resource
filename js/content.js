;(function (window, document) {
  function queryAll(selector, dom) {
    return (dom instanceof HTMLElement ? dom : document).querySelectorAll(
      selector
    )
  }
  function toArray(arr) {
    return Array.prototype.slice.call(arr)
  }
  function replaceWitch(dom, replace) {
    var parent
    if (dom instanceof HTMLElement && replace instanceof HTMLElement) {
      parent = dom.parentElement
      parent.replaceChild(replace, dom)
    }
  }
  var scripts, links
  var cssSource = []
  var scriptSource = []
  function getAllResource() {
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
    var tag = prop === 'src' ? 'script' : 'link'
    var newSrc = src.replace(reg, '')
    newSrc = newSrc + '?v=' + Math.random().toString(16).slice(2)
    // dom[prop] = newSrc
    var newDom = document.createElement(tag)
    if (tag === 'link') {
      newDom.rel = 'stylesheet'
    }
    return new Promise(function (resolve, reject) {
      newDom.onload = function () {
        resolve({ old: src, new: newSrc, type: type })
      }
      newDom.onerror = function (e) {
        reject(e)
      }
      newDom[prop] = newSrc
      replaceWitch(dom, newDom)
      function update(arr, element, newElement) {
        var index = arr.indexOf(element)
        arr.splice(index, 1, newElement)
      }
      if (tag === 'link') {
        update(links, dom, newDom)
      }else{
        update(scripts, dom, newDom)
      }
    })
    // return {old: src, new: newSrc, type: type}
  }
  function updateResource(data, sendResponse) {
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
    Promise.all(queue).then(function (data) {
      chrome.runtime.sendMessage(
        { type: 'resource', data: data },
        function (response) {
          if (!response) console.error('no response')
        }
      )
      // console.log(data)
      // sendResponse(data)
    })
    sendResponse('ok')
    // return queue
  }

  chrome.runtime.onMessage.addListener(function (
    request,
    sender,
    sendResponse
  ) {
    var resource
    if (request.type === 'getAllResource') {
      resource = getAllResource()
      sendResponse(resource)
    } else if (request.type === 'updateResource') {
      // sendResponse(updateResource(request.data))
      updateResource(request.data, sendResponse)
    }
  })
})(window, document)

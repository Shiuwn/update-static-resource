;(function (window, document) {
  function truncStr(str) {
    if (typeof str === 'string' && str.length > 40) {
      return str.slice(0, 10) + '...' + str.slice(-20, str.length)
    }
    return str
  }
  function renderList(list) {
    return list
      .map(function (source) {
        return (
          '<li title="' +
          source.src +
          '"><label> <input type="checkbox" value="' +
          source.src +
          '" /><span class="label-name">' +
          truncStr(source.src) +
          '</span></label></li>'
        )
      })
      .join('')
  }
  function render(request) {
    var tpl = ''
    if (request && request.cssSource) {
      tpl +=
        '<h4>CSS 资源<span class="css-update btn-default"><img class="css-update" src="../img/icon.png" style="display: inline-block;width: 16px;vertical-align: top;margin-left: 8px;"/></span></h4>'
      tpl += '<ul class="source-list css-list">'
      tpl += renderList(request.cssSource)
      tpl += '</ul>'
    }
    if (request && request.scriptSource) {
      tpl +=
        '<h4>JS 资源 <span class="js-update btn-default"><img class="js-update" src="../img/icon.png" style="display: inline-block;width: 16px;vertical-align: top;margin-left: 8px;"/></span></h4>'
      tpl += '<ul class="source-list js-list">'
      tpl += renderList(request.scriptSource)
      tpl += '</ul>'
    }
    // app.innerHTML = tpl
    return tpl
  }
  function toArray(arr) {
    return Array.prototype.slice.call(arr)
  }
  function mountEl() {
    this.container = document.querySelector(this.el)
  }
  var Search = {
    el: '.search-mod',
    init() {
      this.mountEl()
      this.bindEvent()
    },
    mountEl: mountEl,
    bindEvent() {
      var input = this.container.querySelector('.search')
      var btn = this.container.querySelector('.search-btn')
      var clearBtn = this.container.querySelector('.clear-btn')
      function search(str, dataset) {
        return dataset.filter(function (d) {
          var reg = new RegExp('.*' + str + '.*', 'g')
          return reg.test(d.src)
        })
      }
      function searchHandler() {
        var value = input.value
        var data = Search.data || {}
        data.cssSource = data.cssSource || []
        data.scriptSource = data.scriptSource || []
        data = data.cssSource.concat(data.scriptSource)
        var result = search(value, data)
        Result.render(result)
      }
      btn.addEventListener('click', searchHandler)
      clearBtn.addEventListener('click', function () {
        Result.clear()
        input.value = ''
      })
      input.addEventListener('keydown', function (e) {
        if (e.code === 'Enter' && input.vlaue) {
          searchHandler()
        }
      })
    },
  }
  var Result = {
    el: '.result-mod',
    init() {
      this.mountEl()
    },
    mountEl: mountEl,
    render(data) {
      var tpl = ''
      if (data.length) {
        tpl += '<ul class="source-list">'
        tpl += renderList(data)
        tpl += '</ul>'
      } else {
        tpl = '<p style="text-align: center;">无结果</p>'
      }
      this.container.style.display = 'block'
      this.container.innerHTML = tpl
    },
    clear() {
      this.container.innerHTML = ''
      this.container.style.display = 'none'
    },
  }
  var List = {
    el: '.list-mod',
    init() {
      this.mountEl()
      this.bindEvent()
    },
    mountEl: mountEl,
    render: function (data) {
      var tpl = render(data)
      this.container.innerHTML = tpl
    },
    bindEvent() {
      var listDom, checkboxList, source, target
      this.container.addEventListener('click', function (e) {
        target = e.target
        if (
          target.classList.contains('css-update') ||
          target.classList.contains('js-update')
        ) {
          if (target.classList.contains('css-update')) {
            listDom = this.querySelector('.css-list')
          } else {
            listDom = this.querySelector('.js-list')
          }
          checkboxList = listDom.querySelectorAll('input:checked')
          target.classList.add('rotate')
          checkboxList = toArray(checkboxList)
          source = checkboxList.map(function (el) {
            return el.value
          })
          sendMessageToContentScript(
            { type: 'updateResource', data: source },
            function (response) {
              // target.classList.remove('rotate')
              if (!response) {
                console.error('no response')
                return
              }
            }
          )
        }
      })
      chrome.runtime.onMessage.addListener(function (
        response,
        sender,
        sendResponse
      ) {
        if (response && response.type === 'resource') {
          target.classList.remove('rotate')
          if(response.data && Array.isArray(response.data)) {
            checkboxList.forEach(function (dom) {
              var src = dom.value
              var sub = response.data.filter(function (r) {
                return r.old === src
              })
              var parent = dom.parentElement.parentElement
              var sibling = dom.nextElementSibling
              if (sub.length) {
                dom.value = sub[0].new
                parent.title = sub[0].new
                sibling.innerHTML = truncStr(sub[0].new)
              }
            })
          }
        }

        sendResponse('ok')
      })
    },
  }
  function sendMessageToContentScript(message, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, message, function (response) {
        if (callback) callback(response)
      })
    })
  }

  sendMessageToContentScript({ type: 'getAllResource' }, function (response) {
    List.render(response)
    Search.data = response
  })

  document.addEventListener('DOMContentLoaded', function () {
    Search.init()
    List.init()
    Result.init()
  })
})(window, document)

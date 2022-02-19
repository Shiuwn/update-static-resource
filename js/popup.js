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
        '<h4>CSS 资源<span class="update-btn btn-default"><img class="update-btn" src="../img/icon.png" style="display: inline-block;width: 16px;vertical-align: top;margin-left: 8px;"/></span></h4>'
      tpl += '<ul class="source-list">'
      tpl += renderList(request.cssSource)
      tpl += '</ul>'
    }
    if (request && request.scriptSource) {
      tpl +=
        '<h4>JS 资源 <span class="update-btn btn-default"><img class="update-btn" src="../img/icon.png" style="display: inline-block;width: 16px;vertical-align: top;margin-left: 8px;"/></span></h4>'
      tpl += '<ul class="source-list">'
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
  // checkboxList 选中的资源dom
  // source 要更新的文件名数
  // target 点击的按钮dom
  var checkboxList, files, btnEl;
  // 最近五次修改记录
  var History = {
    items: [],
    add(item) {
      if(typeof item !== 'string') return
      var reg = /\?v=.*/
      var uniqs = this.items.map(function(item) {
        return item.replace(reg,'')
      })
      var base = item.replace(reg, '')
      var index = uniqs.indexOf(base)
      if(index>-1) {
        this.items.splice(index, 1, item)
        return this
      }
      if(this.items>=5) {
        this.items.pop()
      }
      this.items.unshift(item)
      return this
    },
    get() {
      return this.items
    },
    clear() {
      this.items.length = 0
      chrome.storage.local.clear()
    },
    store() {
      chrome.storage.local.set({history: History.get()}, function() {})
      return this
    },
    sync() {
      chrome.storage.local.get('history', function(res) {
        History.items = res.history || []
      })
      return this
    }
  }
  /**
   * 给content发送文件
   * @param {HTMLElement} target 点击的目标target
   * @param {HTMLElement} container target 所在的容器
   */
  function sendFiles(target, container) {
    if (target.classList.contains('update-btn')) {
      btnEl = target
      checkboxList = container.querySelectorAll('input:checked')
      if(!checkboxList) return
      btnEl.classList.add('rotate')
      checkboxList = toArray(checkboxList)
      files = checkboxList.map(function (el) {
        return el.value
      })
      sendMessageToContentScript(
        { type: 'updateResource', data: files },
        function (response) {
          if (!response) {
            console.error('no response')
            return
          }
        }
      )
    }
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
      var historyBtn = this.container.querySelector('.history-btn')
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
        if(historyBtn.classList.contains('open')) {
          History.clear()
          Recent.render()
          return
        }
        Result.clear()
        input.value = ''
      })
      input.addEventListener('keydown', function (e) {
        if (e.code === 'Enter' && input.vlaue) {
          searchHandler()
        }
      })
      historyBtn.addEventListener('click', function() {
        if(historyBtn.classList.contains('open')) {
          historyBtn.classList.remove('open')
          historyBtn.innerText = '历史记录'
          Recent.clear()
          return
        }
        historyBtn.classList.add('open')
        historyBtn.innerText = '关闭历史'
        Recent.render()
      })
    },
  }
  var Result = {
    el: '.result-mod',
    init() {
      this.mountEl()
      this.bindEvent()
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
      this.container.querySelector('.content').innerHTML = tpl
    },
    clear() {
      this.container.querySelector('.content').innerHTML = ''
      this.container.style.display = 'none'
    },
    bindEvent() {
      this.container.addEventListener('click', function(e) {
        sendFiles(e.target, this)
      })
    }
  }
  var List = {
    el: '.list-mod',
    init() {
      this.mountEl()
      this.bindEvent()
    },
    mountEl: mountEl,
    render(data) {
      var tpl = render(data)
      this.container.innerHTML = tpl
    },
    bindEvent() {
      this.container.addEventListener('click', function (e) {
        sendFiles(e.target, this)
      }) 
    },
  }
  var Recent = {
    el: '.history-mod',
    init() {
      this.mountEl()
      this.bindEvent()
      History.sync()
    },
    mountEl: mountEl,
    render() {
      var tpl = ''
      var data = History.get()
      if (data.length) {
        tpl += '<ul class="source-list">'
        tpl += renderList(data.map(function(d){return {src: d}}))
        tpl += '</ul>'
      } else {
        tpl = '<p style="text-align: center;">无结果</p>'
      }
      this.container.style.display = 'block'
      this.container.querySelector('.content').innerHTML = tpl
    },
    clear() {
      this.container.querySelector('.content').innerHTML = ''
      this.container.style.display = 'none'
    },
    bindEvent() {
      this.container.addEventListener('click', function(e) {
        sendFiles(e.target, this)
      })
    }
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
  // 监听content发来的消息
  chrome.runtime.onMessage.addListener(function (
    response,
    sender,
    sendResponse
  ) {
    if (response && response.type === 'resource') {
      if(!btnEl) return
      btnEl.classList.remove('rotate')
      if(btnEl.classList.contains('result-btn')) {
        checkboxList = document.querySelectorAll('input[type="checkbox"]')
        checkboxList = toArray(checkboxList)
      }
      if (response.data && Array.isArray(response.data)) {
        checkboxList.forEach(function (dom) {
          var src = dom.value
          var sub = response.data.filter(function (r) {
            return r.old === src
          })
          if(!sub.length) return
          var parent = dom.parentElement.parentElement
          var sibling = dom.nextElementSibling
          dom.value = sub[0].new
          parent.title = sub[0].new
          sibling.innerHTML = truncStr(sub[0].new)
          History.add(sub[0].new).store()
        })
      }
    }
    sendResponse('ok')
  })
  document.addEventListener('DOMContentLoaded', function () {
    Search.init()
    List.init()
    Result.init()
    Recent.init()
  })
})(window, document)

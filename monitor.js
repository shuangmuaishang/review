!(function () {
  var API_VERSION = '1.1.7';
  var URL = '//xfer.10jqka.com.cn/femonitor/api/sendevent';
  var delayTime = 5500;
  if (location.protocol.indexOf('http') === -1) {
    URL = 'http:' + URL;
  }
  //公共Log
  var Log = function (functionName, message) {
    if (window.console) {
      console[functionName](message);
    }
  };

  function feMonitor() {
    this.config = {
      API_KEY: '',
      URL: URL,
      title: '', //页面的名称
      slientDev: true, //开发环境是否发送报错请求，默认不发送
      sampleRate: 0.3, //采样率，默认30%
      ignoreErrorPattern: [/stat\.10jqka\.com\.cn/], //需要忽略的异常（匹配msg部分），可以写多个正则，默认为空
      isCollectPerformance: false, //是否收集性能日志，默认收集
      ignorePerformancePattern: [], //不需要采集性能的URL，可以写多个正则，默认为空
      debug: false, //是否为调试模式，调试模式会捕获所有情况，默认为false
      matchURL: [],
      clientVersion: '',
      behaviorLength: 8, // 行为采集长度
      uuid: ''
    };
    this.startTime = '';
    this.errorMap = {
      length: 0
    };
    this.dev = false;
    this.pageOpenTime = new Date().getTime();

    // 行为信息
    this.behaviors = [];
    // this.errorInfo = {};
    this.init();
  }
  feMonitor.prototype = {
    constructor: feMonitor,
    version: API_VERSION,
    init: function () {
      var info = this.getInfo();
      if (info[2] === 'IE' || typeof Object.assign === 'undefined') {
        return;
      }
      this.setAPIKey();
      this.setUUID();
      this.setEnv();
      // this.hookXHR();
      this.hookRequest();
      this.hookFetch();
      this.hookJSONPError();
      this.hookOnError();
      this.hookPromiseError();
      this.hookBehavior();
      //判断是否收集性能日志
      if (this.config.API_KEY === 'ths_b2c') {
        this.sendPerformance();
      }
    },
    setConfig: function (config) {
      try {
        var info = this.getInfo();
        if (info[2] === 'IE' || typeof Object.assign === 'undefined') {
          return;
        }
        this.config = Object.assign(this.config, config);
        if (this.config.isCollectPerformance) {
          this.sendPerformance();
        }
      } catch (e) {
        Log('error', e);
      }
    },
    hookXHR: function (proxy) {
      window._ahrealxhr = window._ahrealxhr || XMLHttpRequest;
      XMLHttpRequest = function () {
        this.xhr = new window._ahrealxhr();
        for (var attr in this.xhr) {
          var type = '';
          try {
            type = typeof this.xhr[attr];
            if (type === 'function') {
              this[attr] = hookfun(attr);
            } else {
              Object.defineProperty(this, attr, {
                get: getFactory(attr),
                set: setFactory(attr)
              });
            }
          } catch (e) {}
        }
      };

      function getFactory(attr) {
        return function () {
          var v = this.hasOwnProperty(attr + '_') ? this[attr + '_'] : this.xhr[attr];
          var attrGetterHook = (proxy[attr] || {})['getter'];
          return (attrGetterHook && attrGetterHook(v, this)) || v;
        };
      }

      function setFactory(attr) {
        return function (v) {
          var xhr = this.xhr;
          var that = this;
          var hook = proxy[attr];

          if (typeof hook === 'function') {
            xhr[attr] = function () {
              var args = [].slice.call(arguments);
              proxy[attr](that) || v.apply(xhr, args);
            };
          } else {
            //If the attribute isn't writeable, generate proxy attribute
            var attrSetterHook = (hook || {})['setter'];
            v = (attrSetterHook && attrSetterHook(v, that)) || v;
            try {
              xhr[attr] = v;
            } catch (e) {
              this[attr + '_'] = v;
            }
          }
        };
      }

      function hookfun(fun) {
        return function () {
          var args = [].slice.call(arguments);
          // args = args.concat(this.xhr);
          if (proxy[fun] && proxy[fun].call(this, args, this.xhr)) {
            return;
          }
          return this.xhr[fun].apply(this.xhr, args);
        };
      }
      return window._ahrealxhr;
    },
    hookRequest: function () {
      var self = this;
      this.hookXHR({
        open: function (arg, xhr) {
          if (typeof arg === 'object') {
            xhr.method = arg[0];
            xhr.requestURL = arg[1];
          }
          xhr._startTime = new Date().getTime();
        },
        send: function (arg, xhr) {
          xhr._requestData = arg;
        },
        onreadystatechange: function (XMLHttpRequest) {
          var xhr = XMLHttpRequest.xhr;

          if (xhr.readyState === 4 && xhr.requestURL !== URL) {
            var state = xhr.status;
            var endTime = new Date().getTime();
            var loadTime = endTime - xhr._startTime;

            if ((state < 200 || state > 300) && state !== 304) {
              var method = xhr.method;
              if (method) {
                method = method.toLocaleUpperCase();
              }
              var err = {
                name: 'Http Error [XHR]',
                msg: xhr.requestURL || '',
                req: {
                  method: method,
                  url: xhr.requestURL,
                  params: xhr._requestData,
                  time: xhr._startTime
                },
                res: {
                  responseText: xhr.responseText,
                  status: xhr.status,
                  statusText: xhr.statusText
                },
                timing: loadTime,
                type: 2
              };
              self.delaySend(err);
            }
          }
          // 记录xhr请求行为
          self.addBehavior('xhr', XMLHttpRequest);
        }
      });
    },
    hookFetch: function () {
      var self = this;
      if (window.fetch && typeof window.fetch === 'function') {
        var oldFetch = window.fetch;
        window.fetch = function () {
          var args = [].slice.call(arguments);
          var startTime = new Date().getTime();
          var result;
          return new Promise(function (resolve, reject) {
            oldFetch
              .apply(window, args)
              .then(
                function (res) {
                  result = res;
                  return res.clone().text();
                },
                function (e) {
                  reject(e);
                  setFetchError({
                    _args: args,
                    _startTime: startTime,
                    _parseError: e
                  });
                  setBehavior({
                    _startTime: startTime,
                    _parseError: e
                  }, args);
                }
              )
              .then(
                function (res) {
                  if (result && !result.ok) {
                    result._args = args;
                    result._startTime = startTime;
                    result._responseText = res;
                    setFetchError(result);
                  }
                  setBehavior(result, args);
                  resolve(result);
                },
                function (e) {
                  reject(e);
                  setFetchError({
                    _args: args,
                    _startTime: startTime,
                    _parseError: e
                  });
                }
              );
          });
        };
        var setFetchError = function (res) {
          var loadTime = new Date().getTime() - res._startTime;
          var args = res._args;
          var method = 'GET';
          if (args[1] && args[1].method) {
            method = args[1].method.toLocaleUpperCase();
          }
          var err = {
            name: 'Http Error [fetch]',
            msg: args[0],
            req: {
              method: method,
              url: args[0],
              params: args[1] || '',
              time: res._startTime
            },
            res: {
              responseText: res._responseText,
              status: res.status || 0,
              statusText: res.statusText
            },
            timing: loadTime,
            type: 2
          };
          if (res._parseError) {
            self.setParseError(res._parseError, err);
          }
          self.delaySend(err);
        };
        var setBehavior = function (res, args) {
          if (!res) {
            return;
          }
          var method = 'GET';
          if (args && args[1] && args[1].method) {
            method = args[1].method.toLocaleUpperCase();
          }
          self.addBehavior('fetch', {
            time: +new Date(),
            category: 'http',
            page: location.hash,
            data: {
              state: res.status || 0,
              url: (args && args[0]) || '',
              method: method
            }
          });
        };
      }
    },
    hookJSONPError: function () {
      var self = this;

      function setScriptError(args, startTime) {
        if (args && args.addEventListener) {
          args.addEventListener('error', function (e) {
            setJSONPError(args, e, startTime);
            setBehavior(args, e);
          });

          args.addEventListener('load', function (e) {
            setBehavior(args);
          });
        }
      }

      function setJSONPError(script, e, startTime) {
        var loadTime = new Date().getTime() - startTime;
        var err = {
          name: 'Http Error [JSONP]',
          msg: script.src,
          req: {
            method: 'GET',
            url: script.src,
            params: '',
            time: startTime
          },
          res: {
            responseText: '',
            status: 0,
            statusText: e.type
          },
          timing: loadTime,
          type: 2
        };
        self.delaySend(err);
      }

      var oldCreate = document.createElement;
      document.createElement = function () {
        var args = [].slice.call(arguments);

        var result = oldCreate.apply(document, args);

        if (args && args[0] && args[0].toLocaleUpperCase().indexOf('SCRIPT') !== -1) {
          var startTime = new Date().getTime();

          setScriptError(result, startTime);
        }
        return result;
      };

      var setBehavior = function (script, e) {
        self.addBehavior('jsonp', {
          time: +new Date(),
          category: 'http',
          page: location.hash,
          data: {
            state: 0,
            url: script.src,
            method: 'GET'
          }
        });
      };
    },
    hookOnError: function () {
      var self = this;
      var getImporveData = function (message, colno, lineno, source, type) {
        return {
          msg: message,
          col: colno,
          line: lineno,
          file_name: source,
          type: type //错误类型 0:caught(主动发送)或者1:uncaught（自动捕获）,3:资源异常
        };
      };
      var addErrorHnadler = function (win) {
        if (win.addEventListener) {
          win.addEventListener(
            'error',
            function (e) {
              var type = 1;
              if (!e.message) {
                e.error = {
                  name: e.target.tagName + ' resource error'
                };
                e.message = e.target.src || e.target.href;
                type = 3;
              }
              var imporveData = getImporveData(e.message, e.colno, e.lineno, e.filename, type);
              self.sendError(e.error, imporveData);
            },
            true
          );
        } else {
          var oldErr = win.onerror;
          win.onerror = function (message, source, lineno, colno, error) {
            if (typeof oldErr === 'function') {
              oldErr(message, source, lineno, colno, error);
            }

            var imporveData = getImporveData(message, colno, lineno, source, 1);
            self.sendError(error, imporveData);
          };
        }
      };
      addErrorHnadler(window);

      if (document.addEventListener && window.MutationObserver) {
        document.addEventListener('DOMContentLoaded', function () {
          var observer = new MutationObserver(function (mutations) {
            if (mutations && mutations.length) {
              for (var i = 0; i < mutations.length; i++) {
                if (mutations[i].addedNodes && mutations[i].addedNodes.length) {
                  for (var j = 0; j < mutations[i].addedNodes.length; j++) {
                    if (mutations[i].addedNodes[j].nodeName === 'IFRAME') {
                      try {
                        addErrorHnadler(mutations[i].addedNodes[j].contentWindow);
                      } catch (e) {}
                    }
                  }
                }
              }
            }
          });
          observer.observe(document.body, {
            childList: true,
            attributes: false,
            characterData: false
          });
        });
      }
      // if (window.addEventListener) {
      //   window.addEventListener('error', function(e) {
      //     // var imporveData = {
      //     //   msg: e.message,
      //     //   col: e.colno,
      //     //   line: e.lineno,
      //     //   file_name: e.filename,
      //     //   type: 1 //错误类型 0:caught(主动发送)或者1:uncaught（自动捕获）
      //     // };
      //     var imporveData = getImporveData(e.message, e.colno, e.lineno, e.filename);
      //     self.sendError(e.error, imporveData);
      //   });
      // } else {
      // }
    },
    hookPromiseError: function () {
      var self = this;
      if (window.addEventListener) {
        window.addEventListener('unhandledrejection', function (e, p) {
          var result = e.reason;
          if (typeof e.reason === 'string') {
            result = {
              name: e.reason.split(':')[0],
              message: e.reason.split('--->')[0],
              stack: e.reason
            };
          }
          self.sendError(result, '', 5);
        });
      }
    },
    hasSend: false,
    sendPerformance: function () {
      var self = this;
      var hash = location.hash;
      if (window.addEventListener) {
        window.addEventListener('click', function () {
          if (location.hash !== hash) {
            self.ajaxPerformance(true);
            self.hasSend = true;
          }
        });
        window.addEventListener('load', function () {
          self.ajaxPerformance(true);
        });
      }
    },
    ajaxPerformance: function (isTimeout) {
      var self = this;

      if ((self.env === 'development' && self.config.slientDev === true) || self.config.sampleRate <= Math.random() || self.hasSend) {
        return;
      }

      self.hasSend = true;
      var send = function () {
        try {
          var pline = self.getPerformance();
          self.ajaxError(pline);
        } catch (e) {
          Log('error', e);
        }
      };
      if (isTimeout) {
        setTimeout(function () {
          send();
        }, 10000);
      } else {
        send();
      }
    },
    setPerformance: function (entry, hash, networkList, maxTime, slowList, preStartTime) {
      preStartTime = preStartTime || 0;
      try {
        networkList.push({
          name: entry.name || entry.initiatorType, //有时候name值为空，大多数是navigation重定向或者系统自定义
          start_time: parseFloat(entry.startTime + preStartTime).toFixed(2),
          duration: parseFloat(entry.duration).toFixed(2),
          response_start: parseFloat(entry.responseStart + preStartTime).toFixed(2),
          response_end: parseFloat(entry.responseEnd + preStartTime).toFixed(2),
          request_start: parseFloat(entry.requestStart + preStartTime).toFixed(2),
          domain_start: parseFloat(entry.domainLookupStart + preStartTime).toFixed(2),
          domain_end: parseFloat(entry.domainLookupEnd + preStartTime).toFixed(2),
          connect_start: parseFloat(entry.connectStart + preStartTime).toFixed(2),
          connect_end: parseFloat(entry.connectEnd + preStartTime).toFixed(2),
          entry_type: entry.entryType,
          initiator_type: entry.initiatorType
        });
        if (entry.name.indexOf('//stat.') === -1 && entry.name.indexOf(URL) === -1) {
          if (entry.duration > 1000 && slowList.length <= 10) {
            slowList.push({
              name: entry.name,
              response_time: parseInt(entry.duration)
            });
          }

          //ignorePerformancePattern剔除一部分不需要计算性能的url
          var isContinue = false;
          if (typeof this.config.ignorePerformancePattern === 'object') {
            if (Array.isArray(this.config.ignorePerformancePattern)) {
              for (var j = 0, len2 = this.config.ignorePerformancePattern.length; j < len2; j++) {
                if (this.config.ignorePerformancePattern[j].test(entry.name)) {
                  isContinue = true;
                  break;
                }
              }
            } else {
              if (this.config.ignorePerformancePattern.test(entry.name)) {
                isContinue = true;
              }
            }
          }

          var regName = entry.name.replace(/callback=.*?&*|_=.*&*/g, '');
          if (!hash[regName] && !isContinue && entry.startTime - maxTime < 1500) {
            // console.log(entry.name,entry.duration)
            hash[regName] = entry.startTime + entry.duration;
            maxTime = hash[regName] > maxTime ? hash[regName] : maxTime;
            // console.log('-',maxTime,hash[entry.name])
          }
        }
      } catch (e) {
        Log('error', e);
      }
      return maxTime;
    },
    setIframePerformance: function (frames, maxTime, networkList, slowList, preStartTime) {
      var iframeEntries = [];
      var frameIndex = 0;
      try {
        iframeEntries = frames.performance.getEntries();
      } catch (e) {
        Log('log', 'Please ignore,跨域iframe:' + e.message);
      }
      var iframeHash = {};
      for (var j = 0, len2 = iframeEntries.length; j < len2; j++) {
        maxTime = this.setPerformance(iframeEntries[j], iframeHash, networkList, maxTime, slowList, preStartTime);
        if (iframeEntries[j].initiatorType === 'iframe' && frames.frames[frameIndex]) {
          var preTime = iframeEntries[j].startTime + preStartTime;

          maxTime = this.setIframePerformance(frames.frames[frameIndex], maxTime, networkList, slowList, preTime);
          frameIndex++;
        }
      }
      return maxTime;
    },
    getPerformance: function () {
      /*================性能相关===========================*/
      var performanceLog = {};
      if (window.performance) {
        var timing = window.performance.timing;
        //DNS域名开始查询的时间，如果有本地的缓存或keep-alive  时间为0
        performanceLog.dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
        //Tcp连接耗时
        performanceLog.tcpTime = timing.connectEnd - timing.connectStart;
        //只针对https
        performanceLog.sslTime = timing.connectEnd - timing.secureConnectionStart;
        //网络请求从发出到服务器第一次响应所耗费的时间，越短越好
        performanceLog.ttfbTime = timing.responseStart - timing.requestStart;
        //数据传输耗时
        performanceLog.transTime = timing.responseEnd - timing.responseStart;
        //DOM解析耗时
        performanceLog.domTime = timing.domInteractive - timing.responseEnd;
        //页面中同步资源加载耗时
        performanceLog.resTime = timing.loadEventStart - timing.domContentLoadedEventEnd;
        //页面首包时间
        performanceLog.firstByteTime = timing.responseStart - timing.domainLookupStart;
        //页面白屏时间
        performanceLog.firstTime = timing.responseEnd - timing.fetchStart;
        //并非DOMReady，它早于DOMReady触发，代表html文档解析完毕，dom tree创建完成，但是内嵌资源（比如外链css、js等）还未加载
        performanceLog.ttiTime = timing.domInteractive - timing.fetchStart;
        //DOM Ready时间  ，即控制台的DOMContentLoaded时间
        performanceLog.readyTime = timing.domContentLoadedEventEnd - timing.fetchStart;
        //页面完全加载时间，即控制台的Load时间
        performanceLog.loadTime =
          timing.loadEventStart - timing.fetchStart < 0 ? window.performance.now() : timing.loadEventStart - timing.fetchStart;
        //页面首次渲染完成时间
        var entries = performance.getEntries();
        // var firstTime = 0;
        // var duration = 0;
        var hash = {};
        var maxTime = performanceLog.loadTime;
        var slowList = [];
        var networkList = [];
        var iframeIndex = 0;

        for (var i = 0, len = entries.length; i < len; i++) {
          // if (entries[i].startTime > performanceLog.loadTime&&entries[i].startTime - maxTime > 1000) {
          //   console.log(entries[i],maxTime)
          //   break;
          // }
          maxTime = this.setPerformance(entries[i], hash, networkList, maxTime, slowList);
          if (entries[i].initiatorType === 'iframe' && window.frames[iframeIndex]) {
            var preStartTime = entries[i].startTime;
            maxTime = this.setIframePerformance(window.frames[iframeIndex], maxTime, networkList, slowList, preStartTime);
            iframeIndex++;
          }
        }
        performanceLog.finishTime = maxTime;
      }
      if (performanceLog.finishTime < 2000) {
        networkList = [];
      }
      /*======================用户信息相关=============================*/
      var userInfo = {};
      // userInfo.language = navigator.language;

      // userInfo.screenHeight = window.screen.height;
      // userInfo.screenWidth = window.screen.width;
      // userInfo.availHeight = window.screen.availHeight;
      // userInfo.availWidth = window.screen.availWidth;
      // userInfo.webWidth = document.body.offsetWidth;
      // userInfo.webHeight = document.body.offsetHeight;
      userInfo.userid = this.getCookie('userid');

      /*======================项目信息信息相关=============================*/
      var projectInfo = {};
      projectInfo.url = location.href;
      projectInfo.title = this.getTitle();
      projectInfo.clientType = this.getClientType();
      projectInfo.api_key = this.config.API_KEY;
      projectInfo.uuid = this.config.uuid;
      // projectInfo.domain = document.domain;
      var slowInfo = {
        slowList: slowList,
        networkList: networkList
      };

      return {
        performanceLog: performanceLog,
        userInfo: userInfo,
        projectInfo: projectInfo,
        slowInfo: slowInfo
      };
    },
    getCookie: function (name) {
      var arr1 = document.cookie.split('; ');
      for (var i = 0, len = arr1.length; i < len; i++) {
        var arr2 = arr1[i].split('=');
        if (arr2[0] === name) {
          return decodeURI(arr2[1]);
        }
      }
      return '';
    },
    ajax: function (options) {
      var self = this;
      var Ajax = function (options) {
        return new Ajax.fn.init(options);
      };

      Ajax.fn = Ajax.prototype = {
        constructor: Ajax,
        // 初始化
        init: function (options) {
          options = options || {};
          // 默认get请求，并转换为大写字母
          options.type = (options.type || 'GET').toUpperCase();
          options.dataType = (options.dataType || 'JSON').toUpperCase();
          this.options = options;
          this.datas = this.formatOptions(options.data) || null;
          var info = self.getInfo();
          var xhr = null;

          if (options.dataType == 'JSONP' && info[2].toUpperCase() == 'IE' && info[3] <= 9.0) {
            // ie9及以下走img跨域
            this.jsonp(options, this.datas);
            return;
          }

          // 创建xmlhttprequest
          if (window.XMLHttpRequest) {
            xhr = new XMLHttpRequest();
          } else {
            // IE6
            xhr = new ActiveXObject('Microsoft.XMLHTTP');
          }

          // 接受数据
          xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
              var status = xhr.status;
              if ((status >= 200 && status < 300) || status == 304) {
                options.success && options.success(JSON.parse(xhr.responseText), xhr.responseXml);
              } else {
                options.error && options.error(status + '：' + xhr.statusText);
              }
            }
          };

          // 发送数据
          if (options.type == 'GET') {
            this.get(xhr, options, this.datas);
          } else if (options.type == 'POST') {
            this.post(xhr, options, JSON.stringify(options.data));
          }
        },
        // 格式化参数
        formatOptions: function (datas) {
          var str = [];
          for (var item in datas) {
            str.push(encodeURIComponent(item) + '=' + encodeURIComponent(datas[item]));
          }
          // 生成随机数，防止缓存
          // str.push(("v=" + Math.random()).replace(".", ""));
          return str.join('&');
        },
        get: function (xhr, options, datas) {
          try {
            xhr.open('GET', options.url + '?' + datas, true);
            xhr.send(null);
          } catch (error) {
            options.error && options.error(error);
          }
        },
        post: function (xhr, options, datas) {
          try {
            xhr.open('POST', options.url, true);
            xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
            // xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8');
            xhr.send(datas);
          } catch (error) {
            options.error && options.error(error);
          }
        },
        jsonp: function (options, datas) {
          try {
            var callbackName = options.jsonpCallBack || 'success';
            // var callback = options[callbackName];
            var img = new Image();
            img.onload = function () {
              img.onload = null;
              img = null;
            };
            img.src = options.url + '?' + datas + (datas ? '&' : '') + 'callback=' + callbackName;
          } catch (error) {
            // error
          }
        }
      };

      Ajax.fn.init.prototype = Ajax.fn;

      return Ajax(options);
    },
    getHxVer: false,
    getHxProduct: false,
    getIgnorePattern: function (errorInfo) {
      var msg = errorInfo.msg;
      var partten = this.config.ignoreErrorPattern;
      if (Object.prototype.toString.call(partten) === '[object Array]') {
        for (var i = 0; i < partten.length; i++) {
          if (partten[i].test(msg)) {
            return true;
          }
        }
      }
    },
    sendClientInfo: function (errInfo) {
      var self = this;
      setTimeout(function () {
        if (
          self.getIgnorePattern(errInfo) ||
          !self.hijackPost(errInfo) ||
          (self.env === 'development' && self.config.slientDev === true) ||
          self.config.sampleRate <= Math.random()
        ) {
          return;
        }
        //增加用户行为数据
        errInfo.behavior = self.behaviors;
        // 增加userid
        errInfo.userid = self.getCookie('userid')
        //增加页面打开的时间
        if (typeof errInfo.extra_data === 'object') {
          errInfo.extra_data = Object.assign(errInfo.extra_data, {
            __pageOpenTime: self.pageOpenTime
          });
        } else if (typeof errInfo.extra_data === 'undefined') {
          errInfo.extra_data = {
            __pageOpenTime: self.pageOpenTime
          };
        }
        if (window.API !== undefined && window.bindSessionArr !== undefined) {
          if (self.getHxVer && self.getHxProduct) {
            errInfo.client_version = self.config.clientVersion;
            self.ajaxError(errInfo);
          } else {
            API.use({
              method: 'Util.getHxVer',
              success: function (result) {
                self.getHxVer = true;
                window.API.use({
                  method: 'Util.getHxProduct',
                  success: function (num) {
                    self.getHxProduct = true;
                    errInfo.client_version = result + '_' + num;
                    self.config.clientVersion = errInfo.client_version;
                    self.ajaxError(errInfo);
                  },
                  error: function () {
                    errInfo.client_version = result;
                    self.ajaxError(errInfo);
                  }
                });
              },
              error: function (errorcode, errormsg) {
                errInfo.client_version = 'Util.getHxVer failed' + errorcode + errormsg;
                self.ajaxError(errInfo);
              },
              notClient: function (result) {
                errInfo.client_version = 'notClient';
                self.ajaxError(errInfo);
              }
            });
          }
        } else {
          errInfo.client_version = 'API undefined';
          self.ajaxError(errInfo);
        }
      }, 0);
    },
    /**
     * 发送限制方法
     * @param {*} error 错误信息
     * @param {*} config 配置项，可不传。
     * time：时间限制; max：最大发送个数; errorTypeKey：错误类型区分字段
     */
    hijackPost: function (error, config) {
      if (!error) return false;
      var typeList = {
        0: ['name', 'msg', 'req_url'],
        1: ['name', 'msg', 'type']
      };
      config = config || {
        errorTypeKey: {
          2: typeList[0],
          0: typeList[1],
          3: typeList[1],
          1: typeList[1],
          5: typeList[1]
        },
        max: 10,
        time: 60000
      };

      var nowtime = new Date().getTime();
      // 记录第一个请求开始时间
      this.errorMap.length ? null : (this.startTime = nowtime);

      // 当前请求与开始时间超过60s，清空限制
      if (nowtime - this.startTime >= config.time) {
        this.startTime = nowtime;
        this.errorMap = {
          length: 0
        };
      }

      if (this.errorMap.length == config.max) {
        // 一分钟只能发送十个错误信息
        return false;
      }

      try {
        var key = [];
        var typeKeys = config.errorTypeKey[error.type];

        // 不同错误区分的类型
        for (var i = 0; i < typeKeys.length; i++) {
          key.push(error[typeKeys[i]]);
        }
        // 拼接成字符串
        key = key.join('+');

        if (this.errorMap[key]) {
          // 同一个错误一分钟会只能发送一次
          return false;
        } else {
          this.errorMap[key] = new Date().getTime();
          this.errorMap.length++;
          return true;
        }
      } catch (e) {
        Log('error', e);

        // 报错不发送
        return false;
      }
    },
    send: function (name, msg, extraData) {
      //字符串不能传过大，暂时设定255个字符串
      try {
        var extraDataStr;
        if (extraData) {
          extraDataStr = JSON.stringify(extraData);
          if (extraDataStr.length > 255) {
            extraData = extraDataStr.substring(0, 255);
          }
        }

        var errInfo = {
          type: 0,
          name: name + '',
          msg: msg + '',
          extra_data: extraData
        };
        this.setAPIInfo(errInfo);
        this.setClientInfo(errInfo);
        this.sendClientInfo(errInfo);
      } catch (e) {
        Log('log', e);
      }
    },
    ajaxError: function (err) {
      this.ajax({
        type: 'POST',
        data: err,
        url: this.config.URL,
        success: function (res) {
          // console.log(res);
        },
        error: function (error) {
          // error
        }
      });
    },
    setAPIInfo: function (errInfo) {
      errInfo.api_key = this.config.API_KEY;
      errInfo.api_version = API_VERSION;
      errInfo.uuid = this.config.uuid;
    },
    getEnv: function () {
      return window.location.host.indexOf('127.0.0.1') + window.location.host.indexOf('localhost');
    },
    setEnv: function () {
      this.env = this.getEnv() === -2 ? 'production' : 'development';
    },
    setAPIKey: function () {
      this.config.API_KEY = this.config.API_KEY ? this.config.API_KEY : document.getElementById('monitor-script').getAttribute('api_key');
    },
    setUUID: function () {
      this.config.uuid = this.config.uuid ? this.config.uuid : document.getElementById('monitor-script').getAttribute('uuid');
    },
    getTitle: function () {
      var title = this.config.title || document.title || '';
      return title.length > 255 ? title.substring(0, 255) : title;
    },
    setClientInfo: function (errInfo) {
      var clientInfo = this.getInfo();
      var event_version = this.getEnv();
      var err = {
        engine: clientInfo[5],
        browser: clientInfo[2] + ' ' + clientInfo[3],
        os: clientInfo[0],
        os_version: clientInfo[1],
        event_version: event_version === -2 ? 1 : 0,
        client_type: this.getClientType(),
        url: window.location.href,
        title: this.getTitle(),
        sampleRate: this.config.sampleRate
      };
      errInfo = Object.assign(errInfo, err);
    },
    getClientType: function () {
      var t1 = !!(window.external && 'createObject' in window.external) && 1; //统一版
      var t2 = !!(window.HevoCef && 'IsHevoCef' in window.HevoCef) && 2; //远航版
      var t3 = !!window.MacStockMetaData && 3; //MAC版本
      return 0 + t1 + t2 + t3;
    },
    sendError: function (err, errImprove, type) {
      var self = this;
      type = type === undefined ? 1 : type;
      var errInfo = {
        type: type // 0:caught(主动发送)或者1:uncaught（自动捕获）
      };
      self.setParseError(err, errInfo);
      if (errImprove) {
        for (var key in errImprove) {
          errInfo[key] = errImprove[key];
        }
      }
      self.delaySend(errInfo);
    },
    delaySend: function (errInfo) {
      var self = this;
      setTimeout(function () {
        self.setAPIInfo(errInfo);
        self.setClientInfo(errInfo);
        self.sendClientInfo(errInfo);
      }, delayTime);
    },
    setParseError: function (err, errInfo) {
      try {
        var parseError = err === undefined ? [{}] : ErrorStackParser(StackFrame).parse(err);
      } catch (e) {
        var parseError = [{}];
        // if (window.console) {
        //   console.error('解析StackFrame失败,可能是script error，没有增加crossorigin导致跨域~', err);
        // }
      }
      if (err === undefined || err === null) {
        err = {
          name: 'did not catch',
          message: 'No specific exception information was caught'
        };
      }
      errInfo.col = parseError[0].columnNumber;
      errInfo.line = parseError[0].lineNumber;
      errInfo.file_name = parseError[0].fileName || parseError[0].source;
      errInfo.name = err.name || 'NONE';
      errInfo.msg = err.message || 'NONE';
      errInfo.stacktrace = err.stack;
      return parseError;
    },
    // 直接调用getInfo()函数，return array[6],array[0]:操作系统类型，array[1]:操作系统版本，array[2]:是否ie8及以下，array[3]:浏览器类型，array[4]:浏览器版本号，array[5]:浏览器内核
    getInfo: function () {
      var agent = navigator.userAgent.toLocaleLowerCase();
      var OSBrower = [];
      OSBrower = OSBrower.concat(this.getOS(agent), this.getBrower(agent), this.getBrowerKernel(agent));
      // var info = document.getElementById('info');
      // info.innerHTML = '操作系统：' + OSBrower[0] + OSBrower[1] + ' , 浏览器：' + OSBrower[2] + OSBrower[3] +
      //     ' , 是否是IE8以下：' +
      //     OSBrower[4] + '，其他信息：' + agent + ' ， 操作系统信息：' + navigator.platform;
      // alert('操作系统：' + OSBrower[0] + OSBrower[1] + ' , 浏览器：' + OSBrower[2] + OSBrower[3] + ' , 是否是IE8以下：' +
      //     OSBrower[4] + '，其他信息：' + agent + ' ， 操作系统信息：' + navigator.platform);
      return OSBrower;
    },
    // 获取浏览器内核类型
    getBrowerKernel: function (agent) {
      var kernel = [];
      if (agent.indexOf('msie') > -1 || agent.indexOf('trident') > -1) {
        kernel.push('Trident');
      } else if (agent.indexOf('opr') > -1) {
        kernel.push('Presto');
      } else if (agent.indexOf('webkit') > -1) {
        kernel.push('Webkit');
      } else if (agent.indexOf('gecko') > -1) {
        kernel.push('Gecko');
      } else {
        kernel.push('浏览器内核未知');
      }
      return kernel;
    },
    // 获取浏览器的类型和版本
    getBrower: function (agent) {
      var regStr_edge = /edge\/[\d.]+/gi;
      // var regStr_ie = /trident\/[\d.]+/gi;
      var regStr_ie_low = /msie\s+[\d.]+/gi;
      var regStr_ff = /firefox\/[\d.]+/gi;
      var regStr_chrome = /chrome\/[\d.]+/gi;
      var regStr_saf = /safari\/[\d.]+/gi;
      var regStr_opera = /opr\/[\d.]+/gi;
      var regStr_wechat = /micromessenger\/[\d.]+/gi;
      var arr = [];
      // IE
      if (agent.indexOf('trident') > -1 || agent.indexOf('msie') > -1) {
        arr.push('IE');
        if (agent.indexOf('msie') > -1) {
          arr.push(agent.match(regStr_ie_low)[0].split(' ')[1]);
        } else if (agent.indexOf('trident') > -1 && agent.indexOf('rv:11') > -1) {
          arr.push('11.0');
        }
        if (arr.length === 1) {
          arr.push('版本未知');
        }
      } else if (agent.indexOf('edge') > -1) {
        //Edge
        arr.push('Edge');
        arr.push(agent.substr(agent.indexOf('edge') + 5, 10));
      } else if (agent.indexOf('firefox') > -1) {
        //firefox
        arr.push('Firefox');
        arr.push(agent.match(regStr_ff)[0].split('/')[1]);
      } else if (agent.indexOf('opr') > -1) {
        //opera
        arr.push('Opera');
        arr.push(agent.match(regStr_opera)[0].split('/')[1]);
      } else if (agent.indexOf('chrome') > -1) {
        //chrome
        arr.push('Chrome');
        arr.push(agent.match(regStr_chrome)[0].split('/')[1]);
      } else if (agent.indexOf('safari') > -1) {
        //safari
        arr.push('Safari');
        arr.push(agent.match(regStr_saf)[0].split('/')[1]);
      } else if (agent.indexOf('micromessenger') > -1) {
        //微信内置浏览器
        arr.push('QQ浏览器(微信内置)');
        aee.push(agent.match(regStr_wechat)[0].split('/')[1]);
      }
      if (arr.length === 0) {
        // alert('请更换主流浏览器，例如chrome,firefox,opera,safari,IE,Edge!');
        arr.push('浏览器信息未知');
        arr.push(' ');
      }
      arr.push(this.isIELower(arr));
      return arr;
    },
    // 获取操作系统的类型和版本
    getOS: function (agent) {
      var regStr_Linux = /ubuntu\s+[\d.]+/gi;
      var regStr_Android = /android\s+[\d.]+/gi;
      var OS = navigator.platform.toLocaleLowerCase();
      var OSArr = [];
      if (OS == 'win32' || OS == 'windows') {
        OSArr.push('Windows');
      } else if (OS == 'mac68k' || OS == 'macppc' || OS == 'macintosh' || OS == 'macintel' || OS == 'iphone' || OS == 'ipad' || OS == 'ipod') {
        OSArr.push('Mac');
      } else if (String(OS).indexOf('linux') != -1) {
        OSArr.push('Linux');
      }
      if (OSArr[0] == 'Windows') {
        if (agent.indexOf('windows nt 4.1') > -1) {
          OSArr.push('98');
        } else if (agent.indexOf('windows nt 5.0') > -1 || agent.indexOf('windows 2000') > -1) {
          OSArr.push('2000');
        } else if (agent.indexOf('windows nt 5.1') > -1 || agent.indexOf('windows xp') > -1) {
          OSArr.push('XP');
        } else if (agent.indexOf('windows nt 5.2') > -1) {
          OSArr.push('XP 64-Bit Edition or server 2003');
        } else if (agent.indexOf('windows nt 6.0') > -1) {
          OSArr.push('Vista');
        } else if (agent.indexOf('windows nt 6.1') > -1) {
          OSArr.push('7');
        } else if (agent.indexOf('windows nt 6.2') > -1) {
          OSArr.push('8 ');
        } else if (agent.indexOf('windows nt 6.3') > -1) {
          OSArr.push('8.1');
        } else if (agent.indexOf('windows nt 10') > -1) {
          OSArr.push('10');
        } else if (agent.indexOf('windows phone') > -1) {
          OSArr.splice(0, 1, 'Windows Phone OS');
          OSArr.push(agent.split('windows phone os')[1].split(';')[0]);
        } else {
          OSArr.push('version not found');
        }
      } else if (OSArr[0] == 'Mac') {
        if (agent.indexOf('iphone') > -1) {
          OSArr.splice(0, 1, 'iPhone');
          OSArr.push(agent.split('like mac')[0].split('iphone os')[1]);
        } else if (agent.indexOf('ipad') > -1) {
          OSArr.splice(0, 1, 'iPad');
          OSArr.push(agent.split('like mac')[0].split('cpu os')[1]);
        } else if (agent.indexOf('ipod') > -1) {
          OSArr.splice(0, 1, 'iPod');
          OSArr.push(agent.split('like mac')[0].split('iphone os')[1]);
        } else {
          OSArr.push('version not found');
        }
      } else if (OSArr[0] == 'Linux') {
        if (agent.indexOf('ubuntu') > -1) {
          OSArr.splice(0, 1, agent.match(regStr_Linux)[0].split(' ')[0]);
          OSArr.push(agent.match(regStr_Linux)[0].split(' ')[1]);
        } else if (agent.indexOf('android') > -1) {
          OSArr.splice(0, 1, agent.match(regStr_Android)[0].split(' ')[0]);
          OSArr.push(agent.match(regStr_Android)[0].split(' ')[1]);
        } else {
          OSArr.push('version not found');
        }
      }
      return OSArr;
    },
    // 是否是IE8及以下
    isIELower: function (arr) {
      if (arr[0] == 'IE' && arr[1] <= 8) {
        return true;
      } else {
        return false;
      }
    },
    // 行为函数初始化
    hookBehavior: function () {
      if (!document.addEventListener) {
        return;
      }
      var types = ['click'];
      var self = this;

      // document全局绑定监听事件
      for (var i = 0; i < types.length; i++) {
        if (document.addEventListener) {
          document.addEventListener(
            types[i],
            function (e) {
              self.eventListener(e);
            },
            true
          );
        } else if (document.attachEvent) {
          document.attachEvent('on' + types[i], function (e) {
            self.eventListener(e);
          });
        }
      }

      var hookArray = ['push'];
      for (var i = 0; i < hookArray.length; i++) {
        var method = hookArray[i];
        var original = self.behaviors[method];
        self.behaviors[method] = function () {
          // 超出队列长度
          if (this.length >= self.config.behaviorLength) {
            this.shift();
          }
          // 过滤上报错误行为
          var args = arguments[0];
          if (args.data.method === 'POST' && args.data.url === URL) {
            return original.apply(this);
          } else {
            return original.apply(this, arguments);
          }
        };
      }
    },
    eventListener: function (e) {
      var self = this;
      // 节点路径数组
      var paths = e.path || (e.composedPath && e.composedPath()) || [];

      // 节点路径字符串
      var pathMsg = [];
      for (var i = paths.length - 3; i >= 0; i--) {
        var tagName = paths[i].tagName.toLowerCase();
        var idName = paths[i].id ? '#' + paths[i].id : '';
        var className = paths[i].className ? '.' + paths[i].className : '';
        pathMsg.push(tagName + idName + className);
      }
      self.addBehavior(e.type, {
        time: +new Date(),
        category: e.type,
        // target: e.target,
        page: location.hash,
        data: {
          path: pathMsg.join(' > '),
          tagName: e.target.tagName.toLowerCase(),
          idName: e.target.id,
          className: e.target.className,
          text: e.target.outerHTML
        }
      });
    },
    addBehavior: function (type, data) {
      var self = this;
      var options = {
        // 处理http
        xhr: function (data) {
          var xhr = data.xhr;
          self.behaviors.push({
            time: +new Date(),
            category: 'http',
            page: location.hash,
            data: {
              state: xhr.status,
              url: xhr.requestURL,
              method: xhr.method.toLocaleUpperCase()
            }
          });
        }
      };

      options[type] ? options[type](data) : self.behaviors.push(data);
    }
  };

  var StackFrame = (function () {
    'use strict';

    function _isNumber(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    }

    function _capitalize(str) {
      return str.charAt(0).toUpperCase() + str.substring(1);
    }

    function _getter(p) {
      return function () {
        return this[p];
      };
    }

    var booleanProps = ['isConstructor', 'isEval', 'isNative', 'isToplevel'];
    var numericProps = ['columnNumber', 'lineNumber'];
    var stringProps = ['fileName', 'functionName', 'source'];
    var arrayProps = ['args'];

    var props = booleanProps.concat(numericProps, stringProps, arrayProps);

    function StackFrame(obj) {
      if (obj instanceof Object) {
        for (var i = 0; i < props.length; i++) {
          if (obj.hasOwnProperty(props[i]) && obj[props[i]] !== undefined) {
            this['set' + _capitalize(props[i])](obj[props[i]]);
          }
        }
      }
    }

    StackFrame.prototype = {
      getArgs: function () {
        return this.args;
      },
      setArgs: function (v) {
        if (Object.prototype.toString.call(v) !== '[object Array]') {
          throw new TypeError('Args must be an Array');
        }
        this.args = v;
      },

      getEvalOrigin: function () {
        return this.evalOrigin;
      },
      setEvalOrigin: function (v) {
        if (v instanceof StackFrame) {
          this.evalOrigin = v;
        } else if (v instanceof Object) {
          this.evalOrigin = new StackFrame(v);
        } else {
          throw new TypeError('Eval Origin must be an Object or StackFrame');
        }
      },

      toString: function () {
        var functionName = this.getFunctionName() || '{anonymous}';
        var args = '(' + (this.getArgs() || []).join(',') + ')';
        var fileName = this.getFileName() ? '@' + this.getFileName() : '';
        var lineNumber = _isNumber(this.getLineNumber()) ? ':' + this.getLineNumber() : '';
        var columnNumber = _isNumber(this.getColumnNumber()) ? ':' + this.getColumnNumber() : '';
        return functionName + args + fileName + lineNumber + columnNumber;
      }
    };

    StackFrame.fromString = function StackFrame$$fromString(str) {
      var argsStartIndex = str.indexOf('(');
      var argsEndIndex = str.lastIndexOf(')');

      var functionName = str.substring(0, argsStartIndex);
      var args = str.substring(argsStartIndex + 1, argsEndIndex).split(',');
      var locationString = str.substring(argsEndIndex + 1);

      if (locationString.indexOf('@') === 0) {
        var parts = /@(.+?)(?::(\d+))?(?::(\d+))?$/.exec(locationString, '');
        var fileName = parts[1];
        var lineNumber = parts[2];
        var columnNumber = parts[3];
      }

      return new StackFrame({
        functionName: functionName,
        args: args || undefined,
        fileName: fileName,
        lineNumber: lineNumber || undefined,
        columnNumber: columnNumber || undefined
      });
    };

    for (var i = 0; i < booleanProps.length; i++) {
      StackFrame.prototype['get' + _capitalize(booleanProps[i])] = _getter(booleanProps[i]);
      StackFrame.prototype['set' + _capitalize(booleanProps[i])] = (function (p) {
        return function (v) {
          this[p] = Boolean(v);
        };
      })(booleanProps[i]);
    }

    for (var j = 0; j < numericProps.length; j++) {
      StackFrame.prototype['get' + _capitalize(numericProps[j])] = _getter(numericProps[j]);
      StackFrame.prototype['set' + _capitalize(numericProps[j])] = (function (p) {
        return function (v) {
          if (!_isNumber(v)) {
            throw new TypeError(p + ' must be a Number');
          }
          this[p] = Number(v);
        };
      })(numericProps[j]);
    }

    for (var k = 0; k < stringProps.length; k++) {
      StackFrame.prototype['get' + _capitalize(stringProps[k])] = _getter(stringProps[k]);
      StackFrame.prototype['set' + _capitalize(stringProps[k])] = (function (p) {
        return function (v) {
          this[p] = String(v);
        };
      })(stringProps[k]);
    }

    return StackFrame;
  })();

  function ErrorStackParser(StackFrame) {
    'use strict';

    var FIREFOX_SAFARI_STACK_REGEXP = /(^|@)\S+\:\d+/;
    var CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+\:\d+|\(native\))/m;
    var SAFARI_NATIVE_CODE_REGEXP = /^(eval@)?(\[native code\])?$/;

    return {
      /**
       * Given an Error object, extract the most information from it.
       *
       * @param {Error} error object
       * @return {Array} of StackFrames
       */
      parse: function ErrorStackParser$$parse(error) {
        if (typeof error.stacktrace !== 'undefined' || typeof error['opera#sourceloc'] !== 'undefined') {
          return this.parseOpera(error);
        } else if (error.stack && error.stack.match(CHROME_IE_STACK_REGEXP)) {
          return this.parseV8OrIE(error);
        } else if (error.stack) {
          return this.parseFFOrSafari(error);
        } else {
          throw new Error('Cannot parse given Error object');
        }
      },

      // Separate line and column numbers from a string of the form: (URI:Line:Column)
      extractLocation: function ErrorStackParser$$extractLocation(urlLike) {
        // Fail-fast but return locations like "(native)"
        if (urlLike.indexOf(':') === -1) {
          return [urlLike];
        }

        var regExp = /(.+?)(?:\:(\d+))?(?:\:(\d+))?$/;
        var parts = regExp.exec(urlLike.replace(/[\(\)]/g, ''));
        return [parts[1], parts[2] || undefined, parts[3] || undefined];
      },

      parseV8OrIE: function ErrorStackParser$$parseV8OrIE(error) {
        var filtered = error.stack.split('\n').filter(function (line) {
          return !!line.match(CHROME_IE_STACK_REGEXP);
        }, this);

        return filtered.map(function (line) {
          if (line.indexOf('(eval ') > -1) {
            // Throw away eval information until we implement stacktrace.js/stackframe#8
            line = line.replace(/eval code/g, 'eval').replace(/(\(eval at [^\()]*)|(\)\,.*$)/g, '');
          }
          var tokens = line
            .replace(/^\s+/, '')
            .replace(/\(eval code/g, '(')
            .split(/\s+/)
            .slice(1);
          var locationParts = this.extractLocation(tokens.pop());
          var functionName = tokens.join(' ') || undefined;
          var fileName = ['eval', '<anonymous>'].indexOf(locationParts[0]) > -1 ? undefined : locationParts[0];

          return new StackFrame({
            functionName: functionName,
            fileName: fileName,
            lineNumber: locationParts[1],
            columnNumber: locationParts[2],
            source: line
          });
        }, this);
      },

      parseFFOrSafari: function ErrorStackParser$$parseFFOrSafari(error) {
        var filtered = error.stack.split('\n').filter(function (line) {
          return !line.match(SAFARI_NATIVE_CODE_REGEXP);
        }, this);

        return filtered.map(function (line) {
          // Throw away eval information until we implement stacktrace.js/stackframe#8
          if (line.indexOf(' > eval') > -1) {
            line = line.replace(/ line (\d+)(?: > eval line \d+)* > eval\:\d+\:\d+/g, ':$1');
          }

          if (line.indexOf('@') === -1 && line.indexOf(':') === -1) {
            // Safari eval frames only have function names and nothing else
            return new StackFrame({
              functionName: line
            });
          } else {
            var functionNameRegex = /((.*".+"[^@]*)?[^@]*)(?:@)/;
            var matches = line.match(functionNameRegex);
            var functionName = matches && matches[1] ? matches[1] : undefined;
            var locationParts = this.extractLocation(line.replace(functionNameRegex, ''));

            return new StackFrame({
              functionName: functionName,
              fileName: locationParts[0],
              lineNumber: locationParts[1],
              columnNumber: locationParts[2],
              source: line
            });
          }
        }, this);
      },

      parseOpera: function ErrorStackParser$$parseOpera(e) {
        if (!e.stacktrace || (e.message.indexOf('\n') > -1 && e.message.split('\n').length > e.stacktrace.split('\n').length)) {
          return this.parseOpera9(e);
        } else if (!e.stack) {
          return this.parseOpera10(e);
        } else {
          return this.parseOpera11(e);
        }
      },

      parseOpera9: function ErrorStackParser$$parseOpera9(e) {
        var lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
        var lines = e.message.split('\n');
        var result = [];

        for (var i = 2, len = lines.length; i < len; i += 2) {
          var match = lineRE.exec(lines[i]);
          if (match) {
            result.push(
              new StackFrame({
                fileName: match[2],
                lineNumber: match[1],
                source: lines[i]
              })
            );
          }
        }

        return result;
      },

      parseOpera10: function ErrorStackParser$$parseOpera10(e) {
        var lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
        var lines = e.stacktrace.split('\n');
        var result = [];

        for (var i = 0, len = lines.length; i < len; i += 2) {
          var match = lineRE.exec(lines[i]);
          if (match) {
            result.push(
              new StackFrame({
                functionName: match[3] || undefined,
                fileName: match[2],
                lineNumber: match[1],
                source: lines[i]
              })
            );
          }
        }

        return result;
      },

      // Opera 10.65+ Error.stack very similar to FF/Safari
      parseOpera11: function ErrorStackParser$$parseOpera11(error) {
        var filtered = error.stack.split('\n').filter(function (line) {
          return !!line.match(FIREFOX_SAFARI_STACK_REGEXP) && !line.match(/^Error created at/);
        }, this);

        return filtered.map(function (line) {
          var tokens = line.split('@');
          var locationParts = this.extractLocation(tokens.pop());
          var functionCall = tokens.shift() || '';
          var functionName = functionCall.replace(/<anonymous function(: (\w+))?>/, '$2').replace(/\([^\)]*\)/g, '') || undefined;
          var argsRaw;
          if (functionCall.match(/\(([^\)]*)\)/)) {
            argsRaw = functionCall.replace(/^[^\(]+\(([^\)]*)\)$/, '$1');
          }
          var args = argsRaw === undefined || argsRaw === '[arguments not available]' ? undefined : argsRaw.split(',');

          return new StackFrame({
            functionName: functionName,
            args: args,
            fileName: locationParts[0],
            lineNumber: locationParts[1],
            columnNumber: locationParts[2],
            source: line
          });
        }, this);
      }
    };
  }

  // if (typeof module !== 'undefined' && typeof exports === 'object') {
  //   module.exports = feMonitor;
  // } else if (typeof define === 'function' && (define.amd || define.cmd)) {
  //   define(function() {
  //     return feMonitor;
  //   });
  // }
  try {
    window.feMonitor = new feMonitor();
  } catch (e) {
    Log('error', e);
  }
  var oldOnload = window.onload;
  window.onload = function(){
	setTimeout(function(){
		// window._thsclog && window._thsclog({name:"thsc-b2c-monitorjs",ver:API_VERSION});  
	},0);
	if(oldOnload){
		oldOnload();
	}
  };
})();

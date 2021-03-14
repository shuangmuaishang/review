// 防抖 
function debounce(fn, delay) {
    let timer = null;
    return function() { 
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, arguments);
            timer = null;
        }, delay)
    }
}

// 节流 (timer = null 不要忘记！)
function throttle(fn, delay) {
    let timer;
    return function() {
        if (!timer) {
            timer = setTimeout(() => {
                fn.apply(this, arguments);
                timer = null;
            }, delay)
        }
    }
}

// 深拷贝
function deepClone(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    // if (obj instanceof Function) {
    //     return function () {
    //         return obj.apply(this, arguments);
    //     }
    // }
    // if (obj instanceof RegExp) {
    //     return new RegExp(obj.source, obj.flags);
    // }
    // if (obj instanceof Date) {
    //     return new Date(obj);
    // }

    let copy = {};
    if (obj.constructor === Array) {
        copy = [];
    }
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            copy[key] = deepClone(obj[key]);
        }
    }
    return copy;
}

// 函数柯里化（其实就是一个收集参数的过程，参数够了就执行给的函数）（return 调用的参数是_args, 跟args没关系了！）
function curry(fn, args) {
    var length = fn.length;
    args = args || [];
    return function() {
        var _args = args.slice(0);
        var arr = [].slice.call(arguments, 0);
        _args = _args.concat(arr);
        var len = _args.length;
        if (len < length) {
            return curry.call(this, fn, _args)
        } else {
            return fn.apply(this, _args)
        }
    }
}

var fn = curry(function(a, b, c) {
    console.log([a, b, c]);
});

// fn("a", "b", "c")
// fn("a", "b")("c")
// fn("a")("b")("c")
// fn("a")("b", "c")

// call、apply、bind可以用Symbol避免fun冲突
Function.prototype.simulateCall = function(content, ...args) {
    let ctx = content || window;
    ctx.fun = this;
    const result = ctx.fun(...args);
    delete ctx.fun;
    return result;
}  
 
Function.prototype.simulateApply = function(content, args) {
    let ctx = content || window;
    ctx.fun = this;
    const result = ctx.fun(...args);
    delete ctx.fun;
    return result;
} 
// console.log(Math.max.simulateApply(this, [3,4,5]))


Function.prototype.simularBind = function (context, ...args) {
    context = context || window;
    context.fn = this;
    
    return function (..._args) {
        args = args.concat(_args);
      
        let res = context.fn(...args);
        delete context.fn;   
        return res;
    }
}
// console.log(Math.max.bind(this)(2,3,4))

function _new(fn, ...arg) {
    const obj = Object.create(fn.prototype);
    const res = fn.apply(obj, arg);
    // 返回三种情况，返回对象则是对象，返回undefined则是构造对象，返回除undefined之外的基本类型则是构造对象
    return res instanceof Object ? res : obj;
}
function Car(color, name) {
    this.color = color;
}
// console.log(_new(Car, 'red'))

function flatten(arr) {
    return arr.reduce(function(prev, next){
        return prev.concat(Array.isArray(next) ? flatten(next) : next)
    }, [])
}
var arr = [1, [2, [3, 4]]];
// console.log(flatten(arr))


class MyPromise {
    constructor(fn) {
        this.resolvedCallbacks = [];
        this.rejectedCallbacks = [];
      
        this.state = 'PENDING';
        this.value = '';
      
        fn(this.resolve.bind(this), this.reject.bind(this));
      
    }
    
    resolve(value) {
        if (this.state === 'PENDING') {
            this.state = 'RESOLVED';
            this.value = value;
        
            this.resolvedCallbacks.map(cb => cb(value));   
        }
    }
    
    reject(value) {
        if (this.state === 'PENDING') {
            this.state = 'REJECTED';
            this.value = value;
        
            this.rejectedCallbacks.map(cb => cb(value));
        }
    }
    
    then(onFulfilled, onRejected) {
        if (this.state === 'PENDING') {
            this.resolvedCallbacks.push(onFulfilled);
            this.rejectedCallbacks.push(onRejected);
        
        }
      
        if (this.state === 'RESOLVED') {
            onFulfilled(this.value);
        }
      
        if (this.state === 'REJECTED') {
            onRejected(this.value);
        }
    }
}
// let a = new MyPromise(function(resolve, reject) {
//     resolve('aaa')
// }).then((data) => {
//     console.log(data)
// })

Promise.myall = function (iterator) {  
    let count = 0//用于计数，当等于len时就resolve
    let len = iterator.length
    let res = []//用于存放结果
    return new Promise((resolve,reject) => {
        for(let i in iterator){
            Promise.resolve(iterator[i])//先转化为Promise对象
            .then((data) => {
                res[i] = data;
                if(++count === len){
                    resolve(res)
                }
            })
            .catch(e => {
                reject(e)
            })
        }
    })
}
// var promise1 = Promise.resolve(3);
// var promise2 = new Promise(function(resolve, reject) {
//   setTimeout(resolve, 2000, 'foo');
// });
// var promise3 = 42;

// Promise.myall([promise1, promise2, promise3]).then(function(values) {
//   console.log(values);
// });
Promise.race = function (iterators) {  
    return new Promise((resolve,reject) => {
        for (const p of iterators) {
            Promise.resolve(p)
            .then((res) => {
                resolve(res)
            })
            .catch(e => {
                reject(e)
            })
        }
    })
}
// var promise1 = new Promise(function(resolve, reject) {
//     setTimeout(resolve, 500, 'one');
// });

// var promise2 = new Promise(function(resolve, reject) {
//     setTimeout(resolve, 100, 'two');
// });
// Promise.race([promise1, promise2]).then(function(value) {
//     console.log(value);
//     // Both resolve, but promise2 is faster
// });

class Axios { 
    constructor() {} 
    request(config) { 
        return new Promise(resolve => { 
            const {url = '', method = 'get', data = {}} = config; 
            // 发送ajax请求 
            const xhr = new XMLHttpRequest(); 
            xhr.open(method, url, true); 
            xhr.onload = function() { 
                resolve(xhr.responseText); 
            } 
            xhr.send(data); 
        }) 
    } 
} 
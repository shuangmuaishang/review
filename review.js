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

// 节流
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

// 函数柯里化（其实就是一个收集参数的过程，参数够了就执行给的函数）
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
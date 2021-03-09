// 单例模式（应用场景：弹窗和vuex）
class Num {
    constructor(num) {
        this.num = num;
    }
    getNum() {
        return this.num;
    }
}
let createInstance = (function() {
    let instance = null;
    return function(num) {
        if (!instance) {
            instance = new Num(num);
        }
        return instance;
    }
})();

let num1 = createInstance(10);
let num2 = createInstance(20);
// console.log(num2.getNum())

// 策略模式
var strategies = {
    "CEO":function(bonus){ //首席执行官
        return bonus*10
    },
    "CTO":function(bonus){ //首席技术官
        return bonus*5
    },
    "CFO":function(bonus){ //首席财务官
        return bonus*4
    },
    "COO":function(bonus){ //首席运营官
        return bonus*2
    }
}

var calculateBonus = function(position,bonus){
    return strategies[position](bonus);
}
//环境类
var ceobonus = calculateBonus('CEO',50);
var ctobonus = calculateBonus('CTO',30);
// console.log(ceobonus,ctobonus);//500 150

// 观察者模式
class Publisher {
    constructor() {
        this.observers = []
        console.log('酸奶订阅公司成立了')
    }
    // 增加订阅者
    add(observer) {
        this.observers.push(observer)
        console.log('有新客户订酸奶了')
    }
    // 移除订阅者
    remove(observer) {
        this.observers.forEach((item, i) => {
            if (item === observer) {
                this.observers.splice(i, 1)
            }
        })
        console.log('有客户取消了酸奶')
    }
    // 通知所有订阅者
    notify() {
        console.log('新的酸奶到了')
        this.observers.forEach((observer) => {
            observer.update(this)
        })
    }
}
// 定义订阅者类
class Observer {
    constructor() {
        console.log('新的客户产生了')
    }

    update() {
        console.log('通知拿酸奶')
    }
}
let a = new Publisher();
let b = new Observer();
a.add(b);
a.notify();


// 借用构造函数继承
function SuperType() {
    this.color = ['red'];
}
function SubType() {
    SuperType.call(this);
    // 划重点，es6 super的原理
    // 创建子类实例时调用SuperType构造函数，于是SubType的每个实例都会将SuperType中的属性复制一份。
}
const instance3 = new SubType();
instance3.color.push('black');
console.log(instance3.color);
const instance4 = new SubType();
console.log(instance4.color);




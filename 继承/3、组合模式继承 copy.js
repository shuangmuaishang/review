// 组合模式继承
function SuperType(name) {
    this.name = name;
    this.colors = ['red'];
}
SuperType.prototype.getName = function() {
    console.log(this.name);
}
function SubType(name, age) {
    SuperType.call(this, name);
    this.age = age;
}
SubType.prototype = new SuperType();
// 这句其实没啥用，不影响instanceof结果
SubType.prototype.constructor = SubType;
SubType.prototype.getAge = function() {
    console.log(this.age);
}

const instance1 = new SubType('liu', 11);
instance1.colors.push('black');
console.log(instance1.colors);
instance1.getName();
instance1.getAge();
const instance2 = new SubType('xiao', 10);
console.log(instance2.colors);
instance2.getName();
instance2.getAge();
console.log(instance2 instanceof SuperType)
console.log(instance2 instanceof SubType)
// 缺点，1、执行了两次父类函数 2、实例和原型中存在了相同的实例和方法，因为原型是父类实例化产物，子类实例是借用父类构造函数生成的



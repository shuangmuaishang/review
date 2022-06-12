// 原型链继承 
function SuperType(){
  this.colors = ["red", "blue", "green"];
}
function SubType(){}

SubType.prototype = new SuperType();

var instance1 = new SubType();
instance1.colors.push("black");
console.log(instance1.colors); //"red,blue,green,black"

var instance2 = new SubType(); 
console.log(instance2.colors); //"red,blue,green,black"

// 缺点：共用一个实例作为原型，如果是引用类型，会导致多个子类实例修改子类原型属性

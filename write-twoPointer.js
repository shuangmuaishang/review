// 双指针、快慢指针
// 141、判断一个链表是否有环
(1)利用快慢指针，快走2步，慢走一步，必会相遇
(2)利用map，遇到重复的就是


// 142、寻找入环节点
(1)利用快慢指针，快慢指针相遇的时候，设置ptr = head，和此时的slow一起走，相遇就是入口
(2)利用map，第一个重复的

// 287、重复的数即成环
(1)快慢指针，寻找入口点，即是重复的数

// 19、删除倒数第N个元素
(1)循环链表获得长度L，即第L - N + 1个(不是index)节点就是要删除的节点，可以设置哑节点，所以L - N + 1的下一个就是要删除的
(2)快慢指针，让fast先走n步，然后慢指针开始走，快指针走完了以后，慢指针就是要删除的，设置哑节点，就是慢指针的下一个是要删除的
注意：fast和slow一起走的时候  while(fast && fast.next)

// 876、链表的中间节点
(1)遍历获得长度 n / 2
(2)快慢指针 slow走1步 fast走两步

// 234、回文链表    
(1)找到中间节点，然后将后半部分链表反转，然后利用原链表和反转链表一长一短进行遍历，当反转链表遍历结束后，前半部分也遍历结束，期间进行比较val是否相同

// 205、反转链表
(1)设置next和prev用来保存，prev代表上一个节点，默认为null，next为下一个节点，用来推进遍历

// 202、快乐数
(1)判断是否无限循环，用map
(2)判断是否无限循环，用快慢指针，slow做一次平方，fast做两次平方

// 160、相交链表
(1)两个指针分别从两个链表出发，当每一个遍历结束完当前链表后，指向另一个链表，第一次相遇即为起始相交节点
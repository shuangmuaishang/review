// 冒泡：每个元素不断与后一个元素比较，如果前者大于后者，交换顺序（时间：O(n2)，空间O(1)）
function bubble(arr) {
    let r = 0;
    for (let i = 0; i < arr.length - 1; i++) {
        console.log('---分界线---')
        for (let j = 0; j < arr.length - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                r = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = r;
            }
            console.log(arr)
        }
    }
    return arr;
}
// console.log(bubble([5,3,4,1,2]))

// 插入排序，第一个视为已经排序好的，从第二个开始，跟前一个进行比对，假如前者大于后者，将前者挪后，继续往前一格，知道遇到前者小于后者，将元素插入（时间：O(n2)，空间O(1)）
function insert(arr) {
    for (let i = 1; i < arr.length; i++) {
        let pre = i - 1;
        let current = arr[i];
        while(pre >= 0 && arr[pre] > current) {
            arr[pre + 1] = arr[pre];
            pre--;
        }
        arr[pre + 1] = current;
    }
    return arr;
}
// console.log(insert([5,3,4,1,2]))

// 归并排序，利用递归，将数组所有分散成单个元素，然后对比大小顺序进行归并组合（时间：O(nlogn)）
function merge(arr) {
    if (arr.length === 1) return arr;
    let left = [], right = [];
        index = Math.floor(arr.length / 2);
    left = arr.slice(0, index);
    right = arr.slice(index, arr.length);
    return mergeAction(merge(left), merge(right));
} 
function mergeAction(left, right) {
    let nl = 0, nr = 0, arr = [];
    while(nl < left.length && nr < right.length) {
        if (left[nl] > right[nr]) {
            arr.push(right[nr++]);
        } else {
            arr.push(left[nl++]);
        }
    }    
    while(nl < left.length) {
        arr.push(left[nl++]);
    }
    while(nr < right.length) {
        arr.push(right[nr++]);
    }
    return arr;
}
// console.log(merge([5,3,4,1,2]))

// 设定基准值，一般取最右边，小于基准值的放左边，大于的放右边（时间：O(nlogn)）
function quick(arr) {
    if (arr.length <= 1) return arr;
    let left = [], right = [];
    let pivot = arr[arr.length -1];
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] < pivot) {
            left.push(arr[i]);
        } else {
            right.push(arr[i]);
        }
    }
    return quick(left).concat(pivot, quick(right));
}
// console.log(quick([5,3,4,1,2]))

// 快速排序in-place版本，选取最右边的为基准值，并设置storeIndex为0，小于的和arr[storeIndex]交换位置，最后将基准值换到arr[storeIndex]上
function quickInPlace(arr) {
    function swap(arr, a, b) {
        let temp = arr[a];
        arr[a] = arr[b];
        arr[b] = temp; 
    }
    function partition(arr, left, right) {
        let pivot = arr[right],
            storeIndex = left;
        for (let i = left; i < right; i++) {
            if (arr[i] < pivot) {
                swap(arr, i, storeIndex);
                storeIndex++;
            }
        }
        swap(arr, right, storeIndex);
        return storeIndex;
    }
    function sort(arr, left, right) {
        if (left > right) return;
        let storeIndex = partition(arr, left, right);
        sort(arr, left, storeIndex - 1);
        sort(arr, storeIndex + 1, right);
    }
    sort(arr, 0, arr.length - 1);
    return arr;
}
// console.log(quickInPlace([5,3,4,1,2]))



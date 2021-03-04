// 贪心问题
var canJump = function(nums) {
    let max = 0;
    for (let i = 0; i < nums.length; i++) {
        if (i > max || max >= nums.length - 1) break;
        max = Math.max(max, i + nums[i]);
    }
    return max >= nums.length - 1;
};
console.log(canJump([0,2,3]))
// 贪心问题
// 55、跳跃游戏（每个index上都有一个数字，表示跳跃的距离，判断能否跳到终点）
(1)设置max，记录每一格跳的最远距离，i > max表示跳不到终点，max >= nums.length - 1表示跳到终点

// 45、跳跃游戏二（每个index上都有一个数字，假设必会到达终点，求得最小的跳跃次数）
(1)设置max，记录每一格跳的最远距离，每次到达最远距离以后，step+1

// 121、买卖股票的最佳时机1（单次买卖）
(1)暴力法，遍历每个数i之后逐个数j，nums[j] - nums[i]的最大值

// 122、买卖股票的最佳时机2（多次买卖，尽可能多的赚钱）
(2)动态规划，对于第i天来说，只有dp[i][0]和dp[i][1]两种情况，即拿着股票和没拿股票的情况

01背包问题
有 n 个物品和一个大小为 m 的背包. 给定数组 A 表示每个物品的大小和数组 V 表示每个物品的价值.
问最多能装入背包的总价值是多大?
样例
输入: m = 10, A = [2, 3, 5, 7], V = [1, 5, 2, 4]
输出: 9
解释: 装入 A[1] 和 A[3] 可以得到最大价值, V[1] + V[3] = 9 
const backPackII = function (m, A, V) {
    let dp = new Array(A.length + 1);
    for (let i = 0; i <= A.length; i++) {
        dp[i] = new Array(m + 1);
    } 
    for (let i = 0; i <= A.length; i++) {
        for (let j = 0; j <= m; j++) {
            if (i === 0 || j === 0) {
                dp[i][j] = 0;
            } else if (A[i - 1] > j) {
                dp[i][j] = dp[i - 1][j]
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i - 1][j - A[i - 1]] + V[i - 1])
            }
        }
    }

    return dp[A.length][m]
}


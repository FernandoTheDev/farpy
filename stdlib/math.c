/**
 * Farpy - A programming language
 *
 * Copyright (c) 2025 Fernando (FernandoTheDev)
 *
 * This software is licensed under the MIT License.
 * See the LICENSE file in the project root for full license information.
 */
#include <math.h>

#define MAX 1000
int memo[MAX];

void init_fib()
{
    for (int i = 0; i < MAX; i++)
        memo[i] = -1;
}

int fibonacci(int n)
{
    if (n <= 0)
        return 0;
    else if (n == 1)
        return 1;

    if (memo[n] != -1)
        return memo[n];

    memo[n] = fibonacci(n - 1) + fibonacci(n - 2);
    return memo[n];
}

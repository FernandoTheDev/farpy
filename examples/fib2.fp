import "io"

fn fibonacci (n: int, a: int, b: int, count: int): void {
    if count < n {
        printf("%d\n", a)
        fibonacci(n, b, a + b, count + 1)
    }
}

fn startFibonacci (n: int): void {
    if n > 0 {
        fibonacci(n, 0, 1, 0)
    }
}

new numTerms = 40

startFibonacci(numTerms)

import "io"

fn fibonacci(n: int): int 
{
    if n <= 1 {
        return n
    }
    return fibonacci(n - 1) + fibonacci(n - 2)
}

printf("%d\n", fibonacci(10))

import "io"

fn fibonacci(n: int): int 
{
    if n <= 0 {
        return 0
    } elif n == 1 {
        return 1
    }

    return fibonacci(n - 1) + fibonacci(n - 2)
}

printf("%d\n", fibonacci(40))

import "io"

for 8..10 step 2 -> i {
    printf("ForLoop\n")
}

for 0..=10 -> i {
    printf("i = %d\n", i)
}

for 1..=100 -> i {
    printf("i = %d\n", i)
}

for 100..=1 step -2 -> i {
    printf("i = %d\n", i)
}

/*

for i = 1; i < 10; i++ {
    printf("i = %d\n", i)
}

// Se eu não especificar, meu 'i' naturalmente é 0
for i; i < 10; i++ {
    printf("i = %d\n", i)
}
*/

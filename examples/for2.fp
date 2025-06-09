import "io"
import "string"

new users: string[] = ["Fernando", "Dev", "Cabral"]

for 1..=2 -> i {
    new len = str_length(users[i])
    for 0..len -> j {
        new user: *string = &users[i]
        printf("%s\n", *user[j])
    }
    printf("%s\n", users[i])
}

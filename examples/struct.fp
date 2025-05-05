import "io"

fn print_user(u: Person): void {
    printf("name: %s\n", u->name)
    printf("age: %d\n", u->age)
}

struct Person {
    name: string;
    age: i16;
}

new user: Person = Person {
    name: "Fernando",
    age: 17
}

print_user(user)

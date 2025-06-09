import "io"

struct User {
    name: string;
    age: int;
}

new u = User {
    name: "MkZ",
    age: 69
}

fn print_user(f: User) {
    printf("Name: %s\nAge: %d\n", f.name, f.age)
}

u.name = "Fernando"
u.age = 17

print_user(u)

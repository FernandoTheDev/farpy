import "io" as io // If an alias is not defined, the entire module context will be merged with the user context, constants, functions and everything else.
import "string"
import "myfile.fp" // How could I import an external file

struct User
{
    name: string;
    username: char[15];
    age: u16;
}

fn foo(bar: User): void
{
    io.print(
        io.format("Name: {bar.name}\n")
    )
}

new mut users: User[] = [
    {
        name: "Fernando",
        username: "@fernandothedev",
        age: 17
    },
    {
        name: "MarkZ",
        username: "@markz",
        age: 99
    }
]

users.push(User { name: "Joe", username: "joe", age: 420 })
users.shift() // Bye joe
users. ... // More

foreach (user: User in users)
{
    foo(user);
}

// The i is our variable used to satisfy the condition
// if an identifier that is not a variable is passed it will be created automatically
// otherwise it will use the external variable.
for (i; 1 < 10; i++)
{
    io.print(i) // 0 .. 10
}

new x: int = 100

//  | CAPTURE EXTERNAL VARS AND CONSTANTS |
// fn |vars|? (args?): return_type {}
// fn (args?): return_type {}
new mut calc: Lambda<int> = fn |x| (): int
{
    return x ** 2 // 1000
}

io.print(calc()) // 100

new name: string = "Fernando lindo"

io.print(name.substr(0, 7)) // Fernando
io.print(name.substr(0, 7).length()) // 8

while (condition)
{
    //
}

do
{
    //
} while(condition)

// We can follow the idea of ​​each Native Type having its own class, with its own methods and some sharing global methods, like length()
// Maybe we can add an OOP system

// Arrays
new myarr: Array<T> = [ ... ]

// Objects
// new myobj: Object<Array<int> = { [10,20],[30,40] }
new myobj: Object<T> = {}
// I don't know if you can put types on objects, it looks bad


// ERROR
        <LOCAL> error <CODE>: <MAIN_MESSAGE>
        --> <FILE>.fp:line:column_start
        |
 <LINE> |    <LINE_CONTENT>
        |          ^-----^ <ERROR_MESSAGE>
        |

// ERROR EXAMPLE
  compiler error E0198: Non-existent function
  --> test.fp:2:1
   |
 2 |    call_foo()
   |    ^--------^ You are calling a function that has not been declared.
   |

// ERROR EXAMPLE
  lexer error E0010: Unknown character
  --> test.fp:2:
   |
 2 |    new mut@ name: string = "Fernando"
   |           ^ This character is not supported by the language.
   |

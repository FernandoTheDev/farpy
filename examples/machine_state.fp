import "io"
import "string"

fn next_state(current: string, event: string): string {
    if str_equals(current, "start") {
        if str_equals(event, "login") {return "authenticated"}
        return "start error"
    }

    if str_equals(current, "authenticated") {
        if str_equals(event, "logout") { return "end" }
        return "authenticated error"
    }

    return "global error"
}

new mut state: string = "start"

state = next_state(state, "login")
printf("Current state: %s\n", state)

state = next_state(state, "logout")
printf("Current state: %s\n", state)

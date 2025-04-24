import "io" import "math"

new PI = pi()
new E = e()

new angle = PI / 4
new sine_value = sin(angle)
new cosine_value = cos(angle)

new exp_value = E ** 5 // e^5
new log_value = log(E)

new complex_calc = ((PI * 100) + (E / 2)) - ((PI / E) * 5) + sine_value - cosine_value + exp_value - log_value

printf("Result of complex calc: %f\n", complex_calc)

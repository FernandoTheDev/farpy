import "io" import "math"

new PI = pi()
new E = e()

new angle1 = PI / 3
new angle2 = PI / 4
new angle3 = PI / 6

new sine1 = sin(angle1)
new cosine1 = cos(angle1)
new tangent1 = tan(angle1)

new cosine2 = cos(angle2)
new tangent2 = tan(angle2)

new sine3 = sin(angle3)
new cosine3 = cos(angle3)
new tangent3 = tan(angle3)

new exp_value1 = E ** 2
new exp_value2 = E ** 3

new log_value1 = log(E)
new log_value2 = log((double)10)

new sqrt_value = sqrt((double)25)

new complex_calc = ((sine1 * cosine2) + (tangent1 ** 2) - (exp_value1 / 5) + (log_value2 * sqrt_value)) / 
                   ((cosine1 + sine3) * (tangent2 - exp_value2) + log_value1) + 
                   (sqrt_value * (cosine3 - sine1)) - (tangent3 ** 3)

printf("Result of complex calc: %f\n", complex_calc)

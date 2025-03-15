clang++ tests/llvm/llvm.cpp $(llvm-config --cxxflags --ldflags --system-libs --libs core) -o bin/llvm
./bin/llvm

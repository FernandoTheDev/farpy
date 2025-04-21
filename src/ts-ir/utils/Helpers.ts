import { LLVMModule } from "../core/LLVMModule.ts";

export function createStringGlobal(
  module: LLVMModule,
  content: string,
): string {
  let escContent = "";
  let byteLength = 0;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === "\\" && i + 1 < content.length) {
      const nextChar = content[i + 1];

      if (nextChar === "n") {
        escContent += "\\0A";
        byteLength += 1;
        i++; // skip n
      } else if (nextChar === '"') {
        escContent += "\\22";
        byteLength += 1;
      } else if (nextChar === "\\") {
        escContent += "\\5C";
        byteLength += 1;
      } else {
        escContent += "\\";
        byteLength += 1;
      }
    } else {
      escContent += char;
      byteLength += 1;
    }
  }

  byteLength += 1;
  const label = `@.str${module.globals.length}`;
  const decl =
    `${label} = private constant [${byteLength} x i8] c"${escContent}\\00"`;

  module.addGlobal(decl);
  return label;
}
